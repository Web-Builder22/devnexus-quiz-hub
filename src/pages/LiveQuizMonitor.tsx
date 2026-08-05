import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Shield, Monitor, Camera, AlertTriangle, Users, ArrowLeft, Loader2, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
}

export function LiveQuizMonitor() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  
  const [students, setStudents] = useState<Map<string, StudentStatus>>(new Map());
  const [quizName, setQuizName] = useState('Loading...');

  useEffect(() => {
    if (!token || !id) return;
    
    // Fetch quiz details for header
    fetch(`/api/v1/quizzes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.title) {
        setQuizName(data.title);
      }
    }).catch(console.error);

    // Initialize socket connection
    const socket = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('admin:join_proctoring', { quizId: parseInt(id) });
    });

    socket.on('proctoring:student_joined', (data: any) => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        next.set(data.socketId, {
          socketId: data.socketId,
          name: data.name,
          email: data.email,
          violations: 0,
          detectedObjects: [],
          cameraActive: false,
          screenActive: false,
          lastUpdate: Date.now(),
          status: 'active'
        });
        return next;
      });
    });

    socket.on('proctoring:update', (data: any) => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        const existing = next.get(data.socketId);
        if (existing) {
          next.set(data.socketId, {
            ...existing,
            violations: data.violations,
            detectedObjects: data.detectedObjects,
            cameraActive: data.cameraActive,
            screenActive: data.screenActive,
            lastUpdate: data.timestamp,
            status: 'active'
          });
        }
        return next;
      });
    });
    
    socket.on('proctoring:student_left', (data: any) => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        const existing = next.get(data.socketId);
        if (existing) {
          next.set(data.socketId, { ...existing, status: 'disconnected' });
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, token]);

  // Periodic cleanup for stale students (if missed disconnect event)
  useEffect(() => {
    const interval = setInterval(() => {
      setStudents(prev => {
        const next = new Map<string, StudentStatus>(prev);
        const now = Date.now();
        let changed = false;
        for (const [socketId, student] of next.entries()) {
          if (student.status === 'active' && now - student.lastUpdate > 15000) {
            next.set(socketId, { ...student, status: 'disconnected' });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = (Array.from(students.values()) as StudentStatus[]).filter(s => s.status === 'active').length;
  const totalViolations = (Array.from(students.values()) as StudentStatus[]).reduce((sum, s) => sum + s.violations, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <Link to="/quizzes" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Live Proctoring Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">{quizName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Students</p>
            <p className="text-2xl font-black text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Live Violations</p>
            <p className="text-2xl font-black text-slate-900">{totalViolations}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
            <p className="text-lg font-bold text-emerald-600">Monitoring Active</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Connected Students</h2>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
            <span className="flex items-center gap-1 ml-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> Disconnected</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-white">
                <th className="py-4 px-6">Student</th>
                <th className="py-4 px-6 text-center">Camera</th>
                <th className="py-4 px-6 text-center">Screen Share</th>
                <th className="py-4 px-6 text-center">Violations</th>
                <th className="py-4 px-6">AI Detected Objects</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(Array.from(students.values()) as StudentStatus[]).map(student => (
                <tr key={student.socketId} className={`hover:bg-slate-50 transition-colors ${student.status === 'disconnected' ? 'opacity-60' : ''}`}>
                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.email}</p>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {student.cameraActive ? (
                      <span className="inline-flex items-center justify-center p-1.5 bg-emerald-100 text-emerald-600 rounded-full" title="Camera Active">
                        <Camera className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center p-1.5 bg-red-100 text-red-600 rounded-full" title="Camera Disabled">
                        <Camera className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {student.screenActive ? (
                      <span className="inline-flex items-center justify-center p-1.5 bg-emerald-100 text-emerald-600 rounded-full" title="Screen Share Active">
                        <Monitor className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center p-1.5 bg-red-100 text-red-600 rounded-full" title="Screen Share Disabled">
                        <Monitor className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${student.violations > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {student.violations}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {student.detectedObjects && student.detectedObjects.length > 0 ? (
                        student.detectedObjects.map((obj, i) => {
                          const isWarning = ['cell phone', 'laptop', 'tv', 'book'].includes(obj) || (obj === 'person' && student.detectedObjects.filter(o => o === 'person').length > 1);
                          return (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded border ${isWarning ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {obj}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {student.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        Disconnected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {students.size === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-400" />
                    Waiting for students to connect...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
