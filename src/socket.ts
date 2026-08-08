import { Server, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { db } from './db/index.ts';
import { quizzes, questions, options } from './db/schema.ts';
import { eq } from 'drizzle-orm';

interface Player {
  socketId: string;
  name: string;
  score: number;
  hasAnsweredCurrent: boolean;
}

interface QuizSession {
  pin: string;
  quizId: number;
  adminSocketId: string;
  state: 'waiting' | 'active' | 'leaderboard' | 'finished';
  currentQuestionIndex: number;
  players: Record<string, Player>; // Map by socketId for simplicity, or unique ID
  questions: any[];
}

const sessions = new Map<string, QuizSession>();
const proctoringSessions = new Map<number, Set<string>>(); // quizId -> Set<adminSocketId>

export function setupSocketIO(server: HTTPServer) {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- PROCTORING EVENTS ---
    
    // Admin joins to monitor proctoring for a specific quiz
    socket.on('admin:join_proctoring', ({ quizId }) => {
      socket.join(`proctoring_admin_${quizId}`);
      if (!proctoringSessions.has(quizId)) {
        proctoringSessions.set(quizId, new Set());
      }
      proctoringSessions.get(quizId)!.add(socket.id);
    });

    // Student joins proctoring
    socket.on('student:join_proctoring', ({ quizId, name, email }) => {
      socket.join(`proctoring_student_${quizId}`);
      // Notify admins
      io.to(`proctoring_admin_${quizId}`).emit('proctoring:student_joined', {
        socketId: socket.id,
        name,
        email
      });
    });

    // Student sends proctoring update
    socket.on('student:proctoring_update', (data) => {
      // data: { quizId, violations, detectedObjects, cameraActive, screenActive }
      if (data.quizId) {
        io.to(`proctoring_admin_${data.quizId}`).emit('proctoring:update', {
          socketId: socket.id,
          ...data,
          timestamp: Date.now()
        });
      }
    });

    // WebRTC Signaling for Live Proctoring
    socket.on('webrtc:offer', (data) => {
      socket.to(data.targetId).emit('webrtc:offer', { offer: data.offer, callerId: socket.id });
    });

    socket.on('webrtc:answer', (data) => {
      socket.to(data.targetId).emit('webrtc:answer', { answer: data.answer, callerId: socket.id });
    });

    socket.on('webrtc:ice-candidate', (data) => {
      socket.to(data.targetId).emit('webrtc:ice-candidate', { candidate: data.candidate, callerId: socket.id });
    });

    socket.on('admin:issue_warning', (data) => {
      socket.to(data.targetId).emit('student:receive_warning', { message: data.message });
    });

    socket.on('admin:end_attempt', (data) => {
      socket.to(data.targetId).emit('student:end_attempt', {});
    });

    socket.on('admin:update_proctoring_settings', ({ quizId, securitySettings }) => {
      io.to(`proctoring_student_${quizId}`).emit('student:proctoring_settings_updated', { securitySettings });
      io.to(`proctoring_admin_${quizId}`).emit('proctoring:settings_updated', { securitySettings });
    });

    // --- KAHOOT STYLE GAME EVENTS ---

    // Admin creates a live session
    socket.on('admin:create_session', async ({ quizId }, callback) => {
      try {
        // Fetch quiz and questions from DB to have it ready in memory
        const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
        if (quizResult.length === 0) {
           return callback({ error: 'Quiz not found' });
        }
        
        const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));

        // Generate a 6 digit PIN
        let pin;
        do {
          pin = Math.floor(100000 + Math.random() * 900000).toString();
        } while (sessions.has(pin));

        sessions.set(pin, {
          pin,
          quizId,
          adminSocketId: socket.id,
          state: 'waiting',
          currentQuestionIndex: -1,
          players: {},
          questions: quizQuestions
        });

        socket.join(pin);
        callback({ success: true, pin });
      } catch (error) {
        console.error(error);
        callback({ error: 'Server error' });
      }
    });

    // Student joins a session by PIN
    socket.on('student:join', ({ pin, name }, callback) => {
      const session = sessions.get(pin);
      if (!session) {
        return callback({ error: 'Invalid PIN' });
      }
      if (session.state !== 'waiting') {
        return callback({ error: 'Game has already started' });
      }

      session.players[socket.id] = {
        socketId: socket.id,
        name,
        score: 0,
        hasAnsweredCurrent: false
      };

      socket.join(pin);
      
      // Notify admin that a student joined
      io.to(session.adminSocketId).emit('admin:player_joined', Object.values(session.players));
      
      callback({ success: true, quizId: session.quizId });
    });

    // Admin starts the game / next question
    socket.on('admin:next_question', ({ pin }) => {
      const session = sessions.get(pin);
      if (!session || session.adminSocketId !== socket.id) return;

      session.currentQuestionIndex++;
      
      // Reset answered state
      Object.values(session.players).forEach(p => p.hasAnsweredCurrent = false);

      if (session.currentQuestionIndex >= session.questions.length) {
        session.state = 'finished';
        io.to(pin).emit('game:finished', Object.values(session.players).sort((a,b) => b.score - a.score));
      } else {
        session.state = 'active';
        const question = session.questions[session.currentQuestionIndex];
        
        // Fetch options for this question
        db.select().from(options).where(eq(options.questionId, question.id)).then(opts => {
          // Send to admin (with correct answers)
          io.to(session.adminSocketId).emit('game:question', {
            index: session.currentQuestionIndex,
            total: session.questions.length,
            questionId: question.id,
            content: question.content,
            points: question.points,
            options: opts
          });
          
          // Send to students (without correct answers, or just index info since they just see colors)
          socket.to(pin).emit('game:question_student', {
            index: session.currentQuestionIndex,
            total: session.questions.length,
            optionsCount: opts.length
          });
        });
      }
    });

    // Student submits answer
    socket.on('student:submit_answer', async ({ pin, selectedOptionIndex }) => {
      const session = sessions.get(pin);
      if (!session || session.state !== 'active') return;

      const player = session.players[socket.id];
      if (player && !player.hasAnsweredCurrent) {
        player.hasAnsweredCurrent = true;
        
        const question = session.questions[session.currentQuestionIndex];
        const opts = await db.select().from(options).where(eq(options.questionId, question.id));
        
        if (opts[selectedOptionIndex] && opts[selectedOptionIndex].isCorrect) {
          player.score += question.points || 1;
        }

        // Notify admin that this student answered
        io.to(session.adminSocketId).emit('admin:player_answered', {
          socketId: socket.id,
          totalAnswers: Object.values(session.players).filter(p => p.hasAnsweredCurrent).length
        });
      }
    });
    
    // Admin shows leaderboard
    socket.on('admin:show_leaderboard', ({ pin }) => {
      const session = sessions.get(pin);
      if (!session || session.adminSocketId !== socket.id) return;
      
      session.state = 'leaderboard';
      const leaderboard = Object.values(session.players).sort((a,b) => b.score - a.score);
      io.to(pin).emit('game:leaderboard', leaderboard);
    });

    socket.on('disconnect', () => {
      // Find any session this user was part of
      for (const [pin, session] of sessions.entries()) {
        if (session.adminSocketId === socket.id) {
          // Admin disconnected, end session
          io.to(pin).emit('game:cancelled');
          sessions.delete(pin);
        } else if (session.players[socket.id]) {
          // Student disconnected
          delete session.players[socket.id];
          io.to(session.adminSocketId).emit('admin:player_left', socket.id);
        }
      }

      // Handle proctoring disconnects
      proctoringSessions.forEach((adminSockets, quizId) => {
        if (adminSockets.has(socket.id)) {
          adminSockets.delete(socket.id);
        } else {
          // Tell admins that this socket disconnected (might be a student)
          io.to(`proctoring_admin_${quizId}`).emit('proctoring:student_left', { socketId: socket.id });
        }
      });
    });
  });
}
