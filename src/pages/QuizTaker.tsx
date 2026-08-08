import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, Loader2, AlertCircle, Shield, Camera, Mic, Monitor, AlertTriangle, Move, Save } from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

interface Option {
  id: number;
  content: string;
}

interface Question {
  id: number;
  type: string;
  content: string;
  points: number;
  options: Option[];
}

interface SecuritySettings {
  fullscreen: boolean;
  tabBlur: boolean;
  copyPaste: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  enableScreenSharing?: boolean;
  enableMicrophone?: boolean;
  enableCamera?: boolean;
  enableFaceDetection?: boolean;
  enableMultiPerson?: boolean;
  enableDeviceDetection?: boolean;
  maxViolations?: number;
  minFaceConfidence?: number;
  multipleFacesBufferSec?: number;
  noFaceBufferSec?: number;
  gazeSensitivity?: 'low' | 'medium' | 'high';
}

interface Quiz {
  id: number;
  title: string;
  timeLimit: number | null;
  startTime?: string | null;
  endTime?: string | null;
  questions: Question[];
  securitySettings?: SecuritySettings;
}


const acquireCameraStream = async (needsCamera: boolean, enableMicrophone?: boolean): Promise<MediaStream | null> => {
  if (!needsCamera && !enableMicrophone) return null;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Media permissions blocked. Please try opening the app in a new tab, or use a secure HTTPS connection.");
  }
  
  if (needsCamera) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: enableMicrophone ? true : false
      });
    } catch (err) {
      console.warn("Preferred camera constraints failed, attempting fallback video constraint:", err);
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: enableMicrophone ? true : false
      });
    }
  } else {
    return await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true
    });
  }
};

const VideoPreview = React.forwardRef<HTMLVideoElement, { className?: string; stream?: MediaStream | null }>(
  ({ className, stream }, ref) => {
    const fallbackRef = useRef<HTMLVideoElement>(null);
    const videoRef = (ref || fallbackRef) as React.MutableRefObject<HTMLVideoElement | null>;

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;

      if (stream) {
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
        });

        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }

        el.muted = true;
        el.playsInline = true;

        const playVideo = () => {
          if (el && (el.paused || el.ended)) {
            el.play().catch(e => console.warn('Video play error (handled):', e));
          }
        };

        playVideo();

        el.addEventListener('loadedmetadata', playVideo);
        el.addEventListener('loadeddata', playVideo);
        el.addEventListener('canplay', playVideo);

        return () => {
          el.removeEventListener('loadedmetadata', playVideo);
          el.removeEventListener('loadeddata', playVideo);
          el.removeEventListener('canplay', playVideo);
        };
      } else {
        el.srcObject = null;
      }
    }, [stream, videoRef]);

    return (
      <video
        ref={ref || fallbackRef}
        autoPlay
        playsInline
        muted
        className={className}
      />
    );
  }
);
VideoPreview.displayName = 'VideoPreview';

const resolveSecuritySettings = (sec: any) => ({
  ...sec,
  enableCamera: sec?.enableCamera ?? true,
  enableFaceDetection: sec?.enableFaceDetection ?? true,
  enableMultiPerson: sec?.enableMultiPerson ?? true,
  enableDeviceDetection: sec?.enableDeviceDetection ?? true,
  enableScreenSharing: sec?.enableScreenSharing ?? false,
  enableMicrophone: sec?.enableMicrophone ?? false,
  maxViolations: sec?.maxViolations ?? 2,
});

export function QuizTaker() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [proctoringPassed, setProctoringPassed] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [participantName, setParticipantName] = useState('');
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    if (user) {
      const defaultName = user.displayName || (user.email ? user.email.split('@')[0] : '');
      setParticipantName(prev => prev || defaultName);
    }
  }, [user]);
  
  // Track selected options and question navigation
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  const selectedOptionsRef = useRef<number[]>([]);
  const violationsRef = useRef(0);
  const attemptIdRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);
  const aiModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const noFaceStartRef = useRef<number | null>(null);
  const multiPersonStartRef = useRef<number | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const isCleaningUpRef = useRef(false);
  const cleanupStreams = useCallback(() => {
    isCleaningUpRef.current = true;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      screenStreamRef.current = null;
    }
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  }, []);

  // PIP Dragging state
  const [pipPos, setPipPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Socket for live reporting
  const socketRef = useRef<Socket | null>(null);

  // Sync ref with state
  useEffect(() => {
    selectedOptionsRef.current = selectedOptions;
    violationsRef.current = violations;
    attemptIdRef.current = attemptId;
  }, [selectedOptions, violations, attemptId]);

  // Initial fetch (only GET)
  useEffect(() => {
    const fetchQuizMetadata = async () => {
      if (!user || !id) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/v1/student/quizzes/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          setError(errData.error || 'Failed to load quiz');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        data.securitySettings = resolveSecuritySettings(data.securitySettings);
        setQuiz(data);
        
        const sec = data.securitySettings;
        const needsCamera = sec?.enableCamera || sec?.enableFaceDetection || sec?.enableMultiPerson || sec?.enableDeviceDetection;
        if (needsCamera || sec?.enableScreenSharing || sec?.enableMicrophone) {
          setProctoringPassed(false);
        } else {
          setProctoringPassed(true);
        }
      } catch (err) {
        setError('An error occurred loading the quiz.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuizMetadata();
  }, [id, user]);

  const rtcPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const initSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io('/', { transports: ['websocket'] });
      socketRef.current.on('connect', () => {
        if (quiz?.id && user) {
          socketRef.current?.emit('student:join_proctoring', {
            quizId: quiz.id,
            name: participantName || user.email,
            email: user.email
          });
        }
      });
      
      socketRef.current.on('webrtc:offer', async (data: any) => {
        if (!socketRef.current) return;
        
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        rtcPeerConnectionRef.current = pc;
        
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, cameraStreamRef.current!);
          });
        }
        
        pc.onicecandidate = (e) => {
          if (e.candidate && socketRef.current) {
            socketRef.current.emit('webrtc:ice-candidate', { targetId: data.callerId, candidate: e.candidate });
          }
        };

        try {
          await pc.setRemoteDescription(data.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('webrtc:answer', { targetId: data.callerId, answer });
        } catch (err) {
          console.error("WebRTC Error:", err);
        }
      });
      
      socketRef.current.on('webrtc:ice-candidate', (data: any) => {
        if (rtcPeerConnectionRef.current && data.candidate) {
          rtcPeerConnectionRef.current.addIceCandidate(data.candidate).catch(e => console.error(e));
        }
      });

      socketRef.current.on('student:receive_warning', (data: any) => {
        setWarningMessage(`Admin Warning: ${data.message || 'Please follow the quiz rules.'}`);
        setShowWarning(true);
      });

      socketRef.current.on('student:proctoring_settings_updated', (data: any) => {
        if (data && data.securitySettings) {
          setQuiz((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              securitySettings: resolveSecuritySettings({
                ...prev.securitySettings,
                ...data.securitySettings
              })
            };
          });
          toast.info("Proctoring sensitivity thresholds updated live by administrator.");
        }
      });

      socketRef.current.on('student:end_attempt', () => {
        toast.error("Your attempt was ended by an administrator.");
        cleanupStreams();
        navigate('/student/dashboard', { state: { openResults: true } });
      });
    }
  }, [quiz?.id, user, participantName, navigate, cleanupStreams]);

  const [cameraStatus, setCameraStatus] = useState<'pending' | 'connected' | 'disconnected' | 'denied' | null>(null);
  const [screenStatus, setScreenStatus] = useState<'pending' | 'connected' | 'disconnected' | 'denied' | null>(null);

  const requestPermissions = async () => {
    if (!quiz?.securitySettings) return;
    setRequestingPermissions(true);
    setPermissionsError('');
    try {
      const sec = quiz.securitySettings;
      
      let cameraStream: MediaStream | null = null;
      let screenStream: MediaStream | null = null;
      
      const needsCamera = sec.enableCamera || sec.enableFaceDetection || sec.enableMultiPerson || sec.enableDeviceDetection;
      if (needsCamera || sec.enableMicrophone) {
        setCameraStatus('pending');
        try {
          cameraStream = await acquireCameraStream(!!needsCamera, sec.enableMicrophone);
          cameraStreamRef.current = cameraStream;
          setCameraStatus('connected');
          if (videoRef.current) {
             videoRef.current.srcObject = cameraStream;
             videoRef.current.play().catch(() => {});
          }
        } catch (e: any) {
          setCameraStatus('denied');
          throw e;
        }
      }

      if (sec.enableScreenSharing) {
        setScreenStatus('pending');
        try {
          if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
            throw new Error('Screen sharing (getDisplayMedia) is not supported in this browser or iframe preview context.');
          }
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
          screenStreamRef.current = screenStream;
          setScreenStatus('connected');
          if (screenRef.current) {
             screenRef.current.srcObject = screenStream;
             screenRef.current.play().catch(() => {});
          }
        } catch (e: any) {
          setScreenStatus('denied');
          if (window.self !== window.top) {
            console.warn('Screen sharing bypassed in iframe preview.');
          } else {
            throw e;
          }
        }
      }
      
      if (needsCamera && cameraStream) {
         const handleCameraEnd = async () => {
           if (isCleaningUpRef.current) return;
           setCameraStatus('disconnected');
           handleViolation('Camera turned off');
           
           // Attempt reconnect
           try {
             const newStream = await acquireCameraStream(true, sec.enableMicrophone);
             if (newStream) {
               cameraStreamRef.current = newStream;
               setCameraStatus('connected');
               if (videoRef.current) {
                 videoRef.current.srcObject = newStream;
                 videoRef.current.play().catch(() => {});
               }
               newStream.getVideoTracks()[0]?.addEventListener('ended', handleCameraEnd);
             }
           } catch (e) {
             console.error("Camera reconnect failed", e);
           }
         };
         cameraStream.getVideoTracks()[0]?.addEventListener('ended', handleCameraEnd);
         
         // Load AI Model
         if (!aiModelRef.current) {
           setAiLoading(true);
           try {
             aiModelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
           } catch (e) {
             console.error("Error loading TF model", e);
           }
           setAiLoading(false);
         }
      }

      if (sec.enableScreenSharing && screenStream) {
         screenStream.getVideoTracks()[0].addEventListener('ended', () => { 
           if (!isCleaningUpRef.current) {
             setScreenStatus('disconnected');
             handleViolation('Screen sharing stopped'); 
           }
         });
      }

      setProctoringPassed(true);
    } catch (err: any) {
      console.error('Proctoring permissions error:', err);
      setPermissionsError(`Failed to get required permissions: ${err.message || 'Please allow access to continue.'}`);
    } finally {
      setRequestingPermissions(false);
    }
  };



  const startDetectionLoop = useCallback(() => {
    const sec = quiz?.securitySettings;
    const needsCamera = sec?.enableCamera || sec?.enableFaceDetection || sec?.enableMultiPerson || sec?.enableDeviceDetection;
    if (!videoRef.current || !aiModelRef.current || !hasStarted || !needsCamera) return;
    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && aiModelRef.current) {
        if (videoRef.current.paused) {
          try {
            await videoRef.current.play();
          } catch (e) {}
        }
        const predictions = await aiModelRef.current.detect(videoRef.current);
        
        const isMobile = window.innerWidth < 768;
        const minConfidence = isMobile ? Math.min(sec?.minFaceConfidence ?? 0.5, 0.35) : (sec?.minFaceConfidence ?? 0.5);
        const validPredictions = predictions.filter(p => p.score >= minConfidence);

        // Draw to canvas for PIP
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            validPredictions.forEach(prediction => {
              const [x, y, width, height] = prediction.bbox;
              ctx.strokeStyle = '#4f46e5';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);
              ctx.fillStyle = '#4f46e5';
              ctx.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, x, y > 10 ? y - 5 : 10);
            });
          }
        }

        const objects = validPredictions.map(p => p.class);
        setDetectedObjects(objects);

        // Security logic with configurable buffers
        const personCount = objects.filter(o => o === 'person').length;
        
        if (sec?.enableFaceDetection) {
          if (personCount === 0) {
            if (noFaceStartRef.current === null) {
              noFaceStartRef.current = Date.now();
            } else {
              const elapsedSec = (Date.now() - noFaceStartRef.current) / 1000;
              const allowedBuffer = (sec?.noFaceBufferSec ?? 4) + (isMobile ? 6 : 0);
              if (elapsedSec >= allowedBuffer) {
                handleViolation('Face not visible / Left frame');
                noFaceStartRef.current = Date.now(); // reset timer after violation trigger
              }
            }
          } else {
            noFaceStartRef.current = null;
          }
        } else {
          noFaceStartRef.current = null;
        }

        if (sec?.enableMultiPerson) {
          if (personCount > 1) {
            if (multiPersonStartRef.current === null) {
              multiPersonStartRef.current = Date.now();
            } else {
              const elapsedSec = (Date.now() - multiPersonStartRef.current) / 1000;
              const allowedBuffer = sec?.multipleFacesBufferSec ?? 3;
              if (elapsedSec >= allowedBuffer) {
                handleViolation('Multiple persons detected');
                multiPersonStartRef.current = Date.now(); // reset timer after violation trigger
              }
            }
          } else {
            multiPersonStartRef.current = null;
          }
        } else {
          multiPersonStartRef.current = null;
        }
        
        if (sec?.enableDeviceDetection) {
           if (objects.includes('cell phone')) {
             handleViolation('Mobile phone detected');
           }
           if (objects.includes('laptop') || objects.includes('tv') || objects.includes('monitor')) {
             handleViolation('Secondary device detected');
           }
           if (objects.includes('book')) {
             handleViolation('Book or notes detected');
           }
        }
      }
      
      // Emit live status to admin
      if (socketRef.current && socketRef.current.connected) {
         socketRef.current.emit('student:proctoring_update', {
            quizId: quiz.id,
            violations: violationsRef.current,
            detectedObjects: detectedObjects,
            cameraActive: cameraStreamRef.current?.getVideoTracks()[0]?.readyState === 'live',
            screenActive: screenStreamRef.current?.getVideoTracks()[0]?.readyState === 'live'
         });
      }

      detectionLoopRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [hasStarted, quiz]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      cleanupStreams();
    };
  }, [cleanupStreams]);

  useEffect(() => {
    if (hasStarted) {
      if (videoRef.current && cameraStreamRef.current) {
        if (videoRef.current.srcObject !== cameraStreamRef.current) {
          videoRef.current.srcObject = cameraStreamRef.current;
        }
        videoRef.current.play().catch(e => console.warn("Video play on start error:", e));
      }
      if (screenRef.current && screenStreamRef.current) {
        if (screenRef.current.srcObject !== screenStreamRef.current) {
          screenRef.current.srcObject = screenStreamRef.current;
        }
        screenRef.current.play().catch(e => console.warn("Screen play on start error:", e));
      }
      initSocket();
      startDetectionLoop();
    }
    return () => {
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
        detectionLoopRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [hasStarted, startDetectionLoop, initSocket]);

  const startQuiz = async () => {
    if (!user || !id || !quiz) return;
    if (!participantName.trim()) {
      toast('Please enter your participant full name for the certificate.');
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      // Start Attempt
      const startRes = await fetch(`/api/v1/student/quizzes/${id}/start`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantName: participantName.trim() })
      });
      
      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        setError(errData.error || 'Failed to start quiz');
        setLoading(false);
        return;
      }
      
      const attemptData = await startRes.json();
      setAttemptId(attemptData.attemptId);
      setViolations(attemptData.violations);
      if (attemptData.existingAnswers && attemptData.existingAnswers.length > 0) {
        setSelectedOptions(attemptData.existingAnswers);
      }
      
      // Randomize if needed
      let randomizedQuiz = { ...quiz };
      if (quiz.securitySettings?.randomizeQuestions) {
        randomizedQuiz.questions = [...quiz.questions].sort(() => Math.random() - 0.5);
      }
      if (quiz.securitySettings?.randomizeOptions) {
        randomizedQuiz.questions = randomizedQuiz.questions.map((q: any) => ({
          ...q,
          options: [...q.options].sort(() => Math.random() - 0.5)
        }));
      }
      setQuiz(randomizedQuiz);
      
      if (attemptData.calculatedEndTime) {
        const calculatedEnd = new Date(attemptData.calculatedEndTime).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((calculatedEnd - now) / 1000));
        setTimeLeft(remaining);
      } else if (quiz.timeLimit) {
        const startedAt = new Date(attemptData.startedAt || new Date()).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startedAt) / 1000);
        const remaining = Math.max(0, (quiz.timeLimit * 60) - elapsed);
        setTimeLeft(remaining);
      }
      
      setHasStarted(true);
    } catch (err) {
      setError('An error occurred starting the quiz.');
    } finally {
      setLoading(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || !hasStarted) return;
    
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, hasStarted]);

  // Security Monitoring (Fullscreen, Blur, etc)
  useEffect(() => {
    if (!hasStarted || !quiz?.securitySettings) return;
    const sec = quiz.securitySettings;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sec.tabBlur) {
        handleViolation('Tab Switch / Window Blur');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && sec.fullscreen) {
         handleViolation('Exited Fullscreen');
      }
    };
    
    const handleWindowBlur = () => {
      if (sec.tabBlur) {
        handleViolation('Window Blur / Focus Lost');
      }
    };



    const handleCopy = (e: ClipboardEvent) => {
      if (sec.copyPaste) {
        e.preventDefault();
        handleViolation('Copy attempted');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    window.addEventListener('blur', handleWindowBlur);
    
    if (sec.fullscreen && !document.fullscreenElement) {
       document.documentElement.requestFullscreen().catch(() => {});
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [hasStarted, quiz]);

  const handleViolation = async (type: string) => {
    if (!attemptIdRef.current || !user || !quiz) return;
    
    const now = Date.now();
    // Debounce to avoid spamming the same violation
    if (now - lastViolationTimeRef.current < 5000) return;
    lastViolationTimeRef.current = now;

    let snapshotImage = null;
    try {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // Get a compressed JPEG base64 (quality 0.5 to save space)
          snapshotImage = canvas.toDataURL('image/jpeg', 0.5);
        }
      }
    } catch (e) {
      console.error('Failed to capture snapshot:', e);
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/student/attempts/${attemptIdRef.current}/violation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, details: `Detected: ${type}`, snapshotImage })
      });
      
      if (res.ok) {
        const data = await res.json();
        setViolations(data.violations);
        
        if (data.autoSubmitted || data.violations >= 2) {
           toast("Quiz has been automatically submitted due to security violations.");
           // Cleanup streams
           cleanupStreams();
           navigate('/student/dashboard', { state: { openResults: true } });
        } else {
           setWarningMessage(`Security Warning: ${type} detected. One more violation will automatically submit your quiz.`);
           setShowWarning(true);
        }
      }
    } catch (err) {
      console.error('Failed to log violation', err);
    }
  };

  
  const handleSaveProgress = async (showToast = true) => {
    if (!attemptIdRef.current || !user || isSubmitting) return;
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/student/attempts/${attemptIdRef.current}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedOptions: selectedOptionsRef.current
        })
      });
      if (res.ok) {
        if (showToast) {
          toast.success('Quiz progress saved successfully!', {
            description: `${selectedOptionsRef.current.length} answers saved securely.`,
            id: 'save-progress'
          });
        }
      } else {
        if (showToast) {
          toast.error('Failed to save quiz progress.');
        }
      }
    } catch (err) {
      if (showToast) {
        toast.error('Network error while saving progress.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-sync answers to server
  useEffect(() => {
    if (!hasStarted || !attemptIdRef.current || !user) return;
    const syncTimeout = setTimeout(async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/v1/student/attempts/${attemptIdRef.current}/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selectedOptions: selectedOptionsRef.current
          })
        });
        if (res.ok) {
          toast.success("Progress auto-saved", { id: "auto-save-toast", duration: 1500 });
        }
      } catch (err) {
        console.error('Failed to sync answers', err);
      }
    }, 2000); // Debounce sync
    return () => clearTimeout(syncTimeout);
  }, [selectedOptions, hasStarted, user]);

  const handleOptionToggle = (questionId: number, optionId: number, isMultiSelect: boolean) => {
    setSelectedOptions(prev => {
      if (isMultiSelect) {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId);
        } else {
          return [...prev, optionId];
        }
      } else {
        const question = quiz?.questions.find(q => q.id === questionId);
        if (!question) return prev;
        
        const questionOptionIds = question.options.map(o => o.id);
        const filteredPrev = prev.filter(id => !questionOptionIds.includes(id));
        return [...filteredPrev, optionId];
      }
    });
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!user || !quiz || !attemptIdRef.current) return;
    
    if (!autoSubmit) {
      const allAnswered = quiz.questions.every(q => {
        const qOptIds = q.options.map(o => o.id);
        return selectedOptionsRef.current.some(id => qOptIds.includes(id));
      });
      if (!allAnswered) {
        setConfirmModal({
          isOpen: true,
          title: "Submit Quiz",
          message: "You have unanswered questions. Are you sure you want to submit?",
          onConfirm: () => {
            setConfirmModal(null);
            executeSubmit(false);
          }
        });
        return;
      }
    }
    
    executeSubmit(autoSubmit);
  };

  const executeSubmit = async (autoSubmit: boolean) => {
    setIsSubmitting(true);
    const toastId = toast.loading(autoSubmit ? 'Auto-submitting quiz...' : 'Submitting your quiz...');
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/student/attempts/${attemptIdRef.current}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isAutoSubmit: autoSubmit,
          selectedOptions: selectedOptionsRef.current
        })
      });
      
      if (response.ok) {
        toast.success(autoSubmit ? "Quiz auto-submitted!" : "Quiz submitted successfully!", {
          id: toastId,
          description: "Your quiz attempt has been recorded."
        });
        cleanupStreams();
        navigate('/student/dashboard', { state: { openResults: true } });
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(`Failed to submit quiz: ${err.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred submitting the quiz.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Drag handling for PIP
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - pipPos.x, y: e.clientY - pipPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPipPos({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (loading && !quiz) return <div className="p-8 text-center text-slate-500 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (error || !quiz) return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-white border border-red-200 rounded-2xl text-center shadow-sm">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-900 mb-2">Oops!</h2>
      <p className="text-slate-600 mb-6">{error}</p>
      <Link to="/student/dashboard" className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
        Return to Dashboard
      </Link>
    </div>
  );

  // Proctoring setup screen
  if (!proctoringPassed && !hasStarted) {
    const sec = quiz.securitySettings;
    const now = new Date();
    const hasNotStarted = quiz.startTime && now < new Date(quiz.startTime);
    const hasEnded = quiz.endTime && now > new Date(quiz.endTime);

    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Proctored Quiz</h2>
          <p className="text-slate-600">This quiz requires strict security monitoring. Please grant the required permissions to continue.</p>
        </div>
        
        {hasNotStarted && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            <h4 className="font-bold">Quiz has not started yet</h4>
            <p className="text-sm mt-1">This quiz will be available starting from <strong>{new Date(quiz.startTime!).toLocaleString()}</strong>.</p>
          </div>
        )}

        {hasEnded && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200">
            <h4 className="font-bold">Quiz has ended</h4>
            <p className="text-sm mt-1">This quiz ended on <strong>{new Date(quiz.endTime!).toLocaleString()}</strong> and is no longer accepting new attempts.</p>
          </div>
        )}

        <div className="mb-6 text-left bg-indigo-50/60 p-5 rounded-xl border border-indigo-100">
          <label className="block text-sm font-bold text-slate-900 mb-1">
            Participant Full Name <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Please confirm your full name as you want it printed on your official certificate upon passing.
          </p>
          <input
            type="text"
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            disabled={!!hasNotStarted || !!hasEnded}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm disabled:opacity-50"
          />
        </div>

        <div className="space-y-4 mb-8">
          {sec?.enableScreenSharing && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Monitor className="w-6 h-6 text-slate-400" />
              <div>
                <h4 className="font-semibold text-slate-900">Screen Sharing</h4>
                <p className="text-sm text-slate-500">You must share your entire screen during the quiz.</p>
              </div>
            </div>
          )}
          {(sec?.enableCamera || sec?.enableFaceDetection || sec?.enableMultiPerson || sec?.enableDeviceDetection) && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Camera className="w-6 h-6 text-slate-400" />
              <div>
                <h4 className="font-semibold text-slate-900">Camera Access & AI Detection</h4>
                <p className="text-sm text-slate-500">Your face must remain visible. AI will continuously monitor for phones, secondary devices, or additional persons.</p>
              </div>
            </div>
          )}
          {sec?.enableMicrophone && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Mic className="w-6 h-6 text-slate-400" />
              <div>
                <h4 className="font-semibold text-slate-900">Microphone Access</h4>
                <p className="text-sm text-slate-500">Audio will be monitored for background noise.</p>
              </div>
            </div>
          )}
        </div>

        {permissionsError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-sm block font-medium">{permissionsError}</span>
              <p className="text-xs mt-1 opacity-90">Note: If you are taking this in a preview iframe, camera and screen sharing might be blocked by browser iframe security. Try opening the app in a new tab.</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                >
                  Open App in New Tab
                </button>
                <button 
                  onClick={() => setProctoringPassed(true)}
                  className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-bold transition-colors"
                >
                  Proceed Without Permissions (Dev Bypass)
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={requestPermissions}
          disabled={requestingPermissions || !!hasNotStarted || !!hasEnded}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {requestingPermissions ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Grant Permissions & Continue'}
        </button>
      </div>
    );
  }

  // Pre-start screen if proctoring passed but not started
  if (proctoringPassed && !hasStarted) {
    const now = new Date();
    const hasNotStarted = quiz.startTime && now < new Date(quiz.startTime);
    const hasEnded = quiz.endTime && now > new Date(quiz.endTime);

    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Start</h2>
        
        {aiLoading && (
          <div className="mb-6 flex flex-col items-center justify-center gap-2 p-4 bg-indigo-50 text-indigo-700 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-semibold text-sm">Loading AI Proctoring Model...</span>
            <span className="text-xs opacity-80">This may take a moment.</span>
          </div>
        )}

        <p className="text-slate-600 mb-6">
          {(quiz.securitySettings?.enableScreenSharing || quiz.securitySettings?.enableCamera || quiz.securitySettings?.enableFaceDetection || quiz.securitySettings?.enableMultiPerson || quiz.securitySettings?.enableDeviceDetection || quiz.securitySettings?.enableMicrophone)
            ? "Permissions granted successfully. Please confirm your details to begin."
            : "Please confirm your details to begin."}
        </p>
        
        {hasNotStarted && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            <h4 className="font-bold">Quiz has not started yet</h4>
            <p className="text-sm mt-1">This quiz will be available starting from <strong>{new Date(quiz.startTime!).toLocaleString()}</strong>.</p>
          </div>
        )}

        {hasEnded && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200">
            <h4 className="font-bold">Quiz has ended</h4>
            <p className="text-sm mt-1">This quiz ended on <strong>{new Date(quiz.endTime!).toLocaleString()}</strong> and is no longer accepting new attempts.</p>
          </div>
        )}

        {cameraStreamRef.current && (
          <div className="mb-6 max-w-sm mx-auto">
            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-md border-2 border-indigo-200">
              <VideoPreview stream={cameraStreamRef.current} className="w-full h-full object-cover transform scale-x-[-1]" />
              <div className="absolute top-2 left-2 bg-black/60 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live Camera Preview
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 text-left bg-indigo-50/60 p-5 rounded-xl border border-indigo-100 max-w-md mx-auto">
          <label className="block text-sm font-bold text-slate-900 mb-1">
            Participant Full Name <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            This name will be printed on your earned certificate of completion.
          </p>
          <input
            type="text"
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            disabled={!!hasNotStarted || !!hasEnded}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm disabled:opacity-50"
          />
        </div>
        
        {/* Hidden screen sharing video */}
        <video ref={screenRef} autoPlay playsInline muted className="hidden" />

        <button
          onClick={startQuiz}
          disabled={loading || aiLoading || !!hasNotStarted || !!hasEnded}
          className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Quiz Now'}
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`max-w-3xl mx-auto pb-24 relative ${quiz.securitySettings?.copyPaste ? 'select-none' : ''}`}>
      {/* Hidden screen sharing active monitoring */}
      <video ref={screenRef} autoPlay playsInline muted className="hidden" />
      
      {/* PIP Floating Camera Preview */}
      {(quiz.securitySettings?.enableCamera || quiz.securitySettings?.enableDeviceDetection || quiz.securitySettings?.enableFaceDetection || quiz.securitySettings?.enableMultiPerson) && (
        <div 
          className="fixed z-50 rounded-xl overflow-hidden shadow-2xl border-4 border-white cursor-move touch-none group"
          style={{ 
            top: pipPos.y, left: pipPos.x,
            width: '240px', height: '180px',
            backgroundColor: '#000'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
             <div className="bg-black/50 text-white text-[10px] px-2 py-1 rounded font-bold backdrop-blur flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
               LIVE
             </div>
             <div className="bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
               <Move className="w-3 h-3" />
             </div>
          </div>
          <VideoPreview ref={videoRef} stream={cameraStreamRef.current} className="w-full h-full object-cover transform scale-x-[-1]" />
          <canvas 
            ref={canvasRef} 
            width={640} 
            height={480} 
            className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none" 
          />
        </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Security Warning</h3>
            <p className="text-slate-600 mb-6">{warningMessage}</p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 p-4 mb-8 shadow-sm flex items-center justify-between rounded-b-2xl">
        <div className="flex items-center gap-4">
          <Link to="/student/dashboard" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-900">{quiz.title}</h1>
            <p className="text-xs text-slate-500">{quiz.questions.length} Questions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {(quiz.securitySettings?.enableCamera || quiz.securitySettings?.enableFaceDetection || quiz.securitySettings?.enableMultiPerson || quiz.securitySettings?.enableDeviceDetection) && (
            <div className="flex items-center gap-1.5" title="Camera Monitoring">
              {cameraStatus === 'connected' && <Camera className="w-5 h-5 text-emerald-500 animate-pulse" />}
              {cameraStatus === 'disconnected' && <Camera className="w-5 h-5 text-red-500" title="Camera Disconnected" />}
              {cameraStatus === 'denied' && <Camera className="w-5 h-5 text-red-500" title="Camera Permission Denied" />}
              {cameraStatus === 'pending' && <Camera className="w-5 h-5 text-amber-500" title="Camera Pending" />}
            </div>
          )}
          {quiz.securitySettings?.enableScreenSharing && (
            <div className="flex items-center gap-1.5" title="Screen Monitoring">
              {screenStatus === 'connected' && <Monitor className="w-5 h-5 text-emerald-500 animate-pulse" />}
              {screenStatus === 'disconnected' && <Monitor className="w-5 h-5 text-red-500" title="Screen Sharing Stopped" />}
              {screenStatus === 'denied' && <Monitor className="w-5 h-5 text-red-500" title="Screen Permission Denied" />}
              {screenStatus === 'pending' && <Monitor className="w-5 h-5 text-amber-500" title="Screen Pending" />}
            </div>
          )}
          {quiz.securitySettings?.enableMicrophone && <Mic className="w-5 h-5 text-emerald-500 animate-pulse" title="Mic Monitoring Active" />}
          
          {timeLeft !== null && (
            <div className={`px-4 py-2 rounded-lg border font-mono font-bold ${
              timeLeft < 60 
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              Time Left: {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Question Progress & Single Question View */}
      <div className="space-y-6 px-4 max-w-3xl mx-auto">
        {quiz.questions && quiz.questions.length > 0 && (() => {
          const totalQuestions = quiz.questions.length;
          const safeIndex = Math.min(Math.max(0, currentQuestionIndex), totalQuestions - 1);
          const currentQ = quiz.questions[safeIndex];
          const isMultiSelect = currentQ.type === 'multiple_select';
          
          const answeredCount = quiz.questions.filter(q => 
            q.options.some(opt => selectedOptions.includes(opt.id))
          ).length;

          return (
            <>
              {/* Question Navigation Matrix / Header */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                      Question {safeIndex + 1} of {totalQuestions}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      ({answeredCount} of {totalQuestions} Answered)
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${Math.round(((safeIndex + 1) / totalQuestions) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Question Numbers Quick Jump Palette */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {quiz.questions.map((q, idx) => {
                    const isAnswered = q.options.some(opt => selectedOptions.includes(opt.id));
                    const isCurrent = idx === safeIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600 ring-offset-2'
                            : isAnswered
                              ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}`}
                      >
                        {idx + 1}
                        {isAnswered && !isCurrent && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Question Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-slate-900 text-lg md:text-xl leading-snug">
                    <span className="text-indigo-600 mr-2">{safeIndex + 1}.</span>
                    {currentQ.content}
                  </h3>
                  <span className="shrink-0 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                    {currentQ.points} pt{currentQ.points !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="p-6 space-y-3">
                  {currentQ.options.map(opt => {
                    const isSelected = selectedOptions.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionToggle(currentQ.id, opt.id, isMultiSelect)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/60' 
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 shrink-0 flex items-center justify-center transition-colors ${
                          isMultiSelect ? 'rounded-md' : 'rounded-full'
                        } border-2 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 group-hover:border-indigo-400 bg-white'
                        }`}>
                          {isSelected && (isMultiSelect ? <div className="w-3 h-3 bg-white rounded-sm" /> : <div className="w-3 h-3 bg-white rounded-full" />)}
                        </div>
                        <span className={`font-medium text-base ${isSelected ? 'text-indigo-950 font-semibold' : 'text-slate-700'}`}>
                          {opt.content}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prev / Next Question Navigation Buttons */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                  disabled={safeIndex === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-xl font-semibold transition-all shadow-xs"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                {safeIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(i => Math.min(totalQuestions - 1, i + 1))}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                  >
                    Next Question
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-7 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Submit Final Quiz
                        <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Footer / Submit bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-600">
            Save your progress anytime or review before submitting.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveProgress(true)}
              disabled={isSaving || isSubmitting}
              className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-800 rounded-xl font-semibold hover:bg-slate-200 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Save className="w-4 h-4 text-indigo-600" />
              )}
              Save Progress
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-7 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Submit Quiz
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-600 mb-8">{confirmModal.message}</p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

