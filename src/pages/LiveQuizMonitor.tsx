import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Shield, Monitor, Camera, AlertTriangle, Users, ArrowLeft, Loader2, Clock, Grid2X2, Video, Copy, ExternalLink, Check, RefreshCw, AlertCircle, X, Eye, Settings, Sliders } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProctoringSettingsPanel, ProctoringSettings } from '../components/ProctoringSettingsPanel';
import { toast } from 'sonner';

interface StudentStatus {
  socketId: string;
  name: string;
  email: string;
  violations: number;
  detectedObjects: string[];
  cameraActive: boolean;
  screenActive: boolean;
  lastUpdate: number;
  status: 'active' | 'disconnected';
  lastViolationTime?: number;
  stream?: MediaStream;
}

function StudentVideo({ stream, name, violations }: { stream?: MediaStream, name: string, violations: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border-2 ${violations > 0 ? 'border-red-500' : 'border-transparent'}`}>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="text-slate-400 flex flex-col items-center">
          <Camera className="w-8 h-8 mb-2 opacity-30" />
          <span className="text-xs font-medium">Waiting for video...</span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stream ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
        {name}
      </div>
      {violations > 0 && (
        <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {violations} Violations
        </div>
      )}
    </div>
  );
}

export function LiveQuizMonitor() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  
  const [students, setStudents] = useState<Map<string, StudentStatus>>(new Map());
  const [quizName, setQuizName] = useState('Loading...');
  
  const [selectedStudent, setSelectedStudent] = useState<StudentStatus | null>(null);
  const [proctoringSettings, setProctoringSettings] = useState<ProctoringSettings>({
    enableCamera: true,
    enableFaceDetection: true,
    enableMultiPerson: true,
    enableDeviceDetection: true,
    minFaceConfidence: 0.5,
    multipleFacesBufferSec: 3,
    noFaceBufferSec: 4,
    gazeSensitivity: 'medium',
    maxViolations: 2,
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    
    // Fetch quiz details for header
    fetch(`/api/v1/quizzes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data) {
        if (data.title) setQuizName(data.title);
        if (data.securitySettings) setProctoringSettings(data.securitySettings);
      }
    }).catch(console.error);

    // Initialize socket connection
    const socket = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('admin:join_proctoring', { quizId: parseInt(id) });
    });

    socket.on('proctoring:student_joined', async (data: any) => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        next.set(data.socketId, {
          ...data,
          violations: 0,
          detectedObjects: [],
          cameraActive: true,
          screenActive: false,
          lastUpdate: Date.now(),
          status: 'active'
        });
        return next;
      });

      // Initialize WebRTC for this student
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnections.current.set(data.socketId, pc);

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc:ice-candidate', { targetId: data.socketId, candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        setStudents(prev => {
          const next = new Map<string, StudentStatus>(prev);
          const s = next.get(data.socketId);
          if (s) {
            next.set(data.socketId, { ...s, stream: e.streams[0] });
          }
          return next;
        });
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:offer', { targetId: data.socketId, offer });
      } catch (err) {
        console.error("Error creating WebRTC offer", err);
      }
    });

    socket.on('webrtc:answer', async (data: any) => {
      const pc = peerConnections.current.get(data.callerId);
      if (pc) {
        await pc.setRemoteDescription(data.answer).catch(e => console.error(e));
      }
    });

    socket.on('webrtc:ice-candidate', (data: any) => {
      const pc = peerConnections.current.get(data.callerId);
      if (pc && data.candidate) {
        pc.addIceCandidate(data.candidate).catch(e => console.error(e));
      }
    });

    socket.on('proctoring:update', (data: any) => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        const s = next.get(data.socketId);
        if (s) {
          let newViolations = s.violations;
          let newLastViolation = s.lastViolationTime;
          
          if (data.violations > s.violations) {
            newViolations = data.violations;
            newLastViolation = Date.now();
          }
          
          next.set(data.socketId, {
            ...s,
            ...data,
            violations: newViolations,
            lastViolationTime: newLastViolation,
            lastUpdate: Date.now(),
            status: 'active'
          });
        }
        return next;
      });
    });

    socket.on('proctoring:student_left', (data: any) => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        const s = next.get(data.socketId);
        if (s) {
          next.set(data.socketId, { ...s, status: 'disconnected' });
        }
        return next;
      });
      // Close PC
      const pc = peerConnections.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(data.socketId);
      }
    });

    socket.on('proctoring:settings_updated', (data: any) => {
      if (data && data.securitySettings) {
        setProctoringSettings(data.securitySettings);
      }
    });

    // Cleanup interval for stale connections
    const interval = setInterval(() => {
      const now = Date.now();
      setStudents(prev => {
        let changed = false;
        const next = new Map<string, StudentStatus>(prev);
        for (const [socketId, s] of next.entries()) {
          if (s.status === 'active' && now - s.lastUpdate > 15000) {
            next.set(socketId, { ...s, status: 'disconnected' });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, [id, token]);

  const handleSaveSettings = async () => {
    if (!token || !id) return;
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/v1/quizzes/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ securitySettings: proctoringSettings })
      });

      if (response.ok) {
        if (socketRef.current) {
          socketRef.current.emit('admin:update_proctoring_settings', {
            quizId: parseInt(id, 10),
            securitySettings: proctoringSettings
          });
        }
        toast.success("Live proctoring sensitivity thresholds updated and broadcast!");
        setIsSettingsModalOpen(false);
      } else {
        toast.error("Failed to update settings.");
      }
    } catch (err) {
      console.error("Error updating proctoring settings:", err);
      toast.error("Error updating proctoring settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const activeCount = Array.from(students.values() as IterableIterator<StudentStatus>).filter(s => s.status === 'active').length;
  const totalViolations = Array.from(students.values() as IterableIterator<StudentStatus>).reduce((sum, s) => sum + s.violations, 0);
  
  const studentList = Array.from(students.values()) as StudentStatus[];
  const activeSelectedStudent = selectedStudent ? students.get(selectedStudent.socketId) || selectedStudent : null;

  // Determine grid layout dynamically based on count
  const getGridCols = () => {
    const count = studentList.length;
    if (count === 0) return 'grid-cols-1';
    if (count === 1) return 'grid-cols-1 md:w-3/4 lg:w-1/2 mx-auto';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    if (count <= 9) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-4 lg:grid-cols-4';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
        <Link to="/admin/dashboard" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Live WebRTC Proctoring
          </h1>
          <p className="text-slate-500 text-sm mt-1">{quizName}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            Proctoring Sensitivity & Rules
          </button>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active</p>
              <p className="text-xl font-black text-slate-900">{activeCount}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Violations</p>
              <p className="text-xl font-black text-red-600">{totalViolations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Removed Google Meet Integration Card */}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Grid2X2 className="w-5 h-5 text-indigo-500" />
            Live Camera Grid
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
            <span className="flex items-center gap-1.5 ml-3"><div className="w-2 h-2 rounded-full bg-slate-300" /> Disconnected</span>
          </div>
        </div>

        {studentList.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-400" />
            <p className="font-medium text-slate-700">Waiting for students to join...</p>
            <p className="text-sm mt-1">When students start the quiz, their cameras will appear here via WebRTC.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${getGridCols()}`}>
            {studentList.map(student => (
              <div key={student.socketId} className={`flex flex-col gap-3 p-4 rounded-xl border ${student.status === 'active' ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'} transition-all`}>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 line-clamp-1">{student.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{student.email}</p>
                      </div>
                    </div>
                    {student.status === 'active' ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        Offline
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Camera</p>
                      <p className="text-xs font-semibold text-slate-700">{student.cameraActive ? 'On' : 'Off'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Violations</p>
                      <p className={`text-xs font-semibold ${student.violations > 0 ? 'text-red-600' : 'text-slate-700'}`}>{student.violations}</p>
                    </div>
                  </div>

                  {student.detectedObjects && student.detectedObjects.length > 0 && (
                     <div className="flex flex-wrap gap-1 mb-2">
                      {student.detectedObjects.map((obj, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {obj}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 mt-auto">
                    <button 
                      onClick={() => setSelectedStudent(student)}
                      className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      View Live Camera
                    </button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (socketRef.current) {
                            socketRef.current.emit('admin:issue_warning', { targetId: student.socketId, message: 'Please keep your eyes on the screen and ensure no one else is in the room.' });
                          }
                        }}
                        className="flex-1 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Warning
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to end the attempt for ${student.name}?`)) {
                            if (socketRef.current) {
                              socketRef.current.emit('admin:end_attempt', { targetId: student.socketId });
                            }
                          }
                        }}
                        className="flex-1 bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        End Attempt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSelectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                  {activeSelectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeSelectedStudent.name}</h3>
                  <p className="text-xs text-slate-500">{activeSelectedStudent.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex-1 overflow-auto">
              <StudentVideo stream={activeSelectedStudent.stream} name={activeSelectedStudent.name} violations={activeSelectedStudent.violations} />
              
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Status</p>
                  <p className="font-semibold text-slate-900">{activeSelectedStudent.status === 'active' ? 'Live' : 'Offline'}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Camera</p>
                  <p className="font-semibold text-slate-900">{activeSelectedStudent.cameraActive ? 'On' : 'Off'}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Violations</p>
                  <p className={`font-semibold ${activeSelectedStudent.violations > 0 ? 'text-red-600' : 'text-slate-900'}`}>{activeSelectedStudent.violations}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Last Update</p>
                  <p className="font-semibold text-slate-900">{new Date(activeSelectedStudent.lastUpdate).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Proctoring Sensitivity Settings</h3>
                  <p className="text-xs text-slate-500">Live configuration for {quizName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <ProctoringSettingsPanel
                settings={proctoringSettings}
                onChange={(updated) => setProctoringSettings(prev => ({ ...prev, ...updated }))}
                onSaveLive={handleSaveSettings}
                isSaving={isSavingSettings}
                showSaveButton={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
