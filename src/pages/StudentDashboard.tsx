import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CertificateRenderer } from '../components/CertificateRenderer';
import { 
  PlayCircle, 
  Clock, 
  CheckCircle, CheckCircle2, 
  Target, 
  Award, 
  Trophy, 
  User, 
  Download, 
  Edit3, 
  BarChart2, 
  X, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Printer, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  Zap,
  Mail,
  Calendar,
  Check,
  Key,
  AlertCircle,
  Eye,
  Loader2,
  HelpCircle
} from 'lucide-react';

interface Quiz {
  id: number;
  title: string;
  createdAt: string;
}

interface Attempt {
  id: number;
  quizId: number;
  quizTitle: string;
  score: number;
  createdAt: string;
  status: string;
  violations?: number;
}

export function StudentDashboard() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  const availableQuizzesRef = useRef<HTMLDivElement>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [realCertificates, setRealCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States: 'none' | 'profile' | 'results' | 'certificates' | 'leaderboard' | 'quiz_instructions'
  const location = useLocation();
  const [activeModal, setActiveModal] = useState<'none' | 'profile' | 'results' | 'certificates' | 'leaderboard' | 'quiz_instructions' | 'review'>(location.state?.openResults ? 'results' : 'none');
  
  // Quiz Code System States
  const [quizCodeInput, setQuizCodeInput] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validatedQuiz, setValidatedQuiz] = useState<any | null>(null);

  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.displayName || user?.email?.split('@')[0] || 'Student');
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  const fetchReview = async (attemptId: number) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/student/attempts/${attemptId}/review`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviewData(data);
        setActiveModal('review');
      } else {
        alert('Could not fetch review.');
      }
    } catch (e) {
      console.error(e);
    }
  };
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);
  const [certData, setCertData] = useState<{template: any, data: any} | null>(null);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizCodeInput.trim() || !user) return;

    setJoiningCode(true);
    setCodeError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/v1/student/quizzes/join-by-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: quizCodeInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setValidatedQuiz(data.quiz);
        setActiveModal('quiz_instructions');
      } else {
        setCodeError(data.error || 'Invalid Quiz Code. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setCodeError('An unexpected error occurred while validating the code.');
    } finally {
      setJoiningCode(false);
    }
  };

  const fetchData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      
      const safeFetch = async (url: string) => {
        try {
          const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!r.ok) {
            console.warn(`Fetch ${url} returned status ${r.status}`);
            return null;
          }
          return await r.json();
        } catch (err) {
          console.error(`Error fetching ${url}:`, err);
          return null;
        }
      };

      const [quizzesData, attemptsData, certsData] = await Promise.all([
        safeFetch('/api/v1/student/quizzes'),
        safeFetch('/api/v1/student/attempts'),
        safeFetch('/api/v1/certificates/my-certificates'),
      ]);

      if (Array.isArray(quizzesData)) setQuizzes(quizzesData);
      if (Array.isArray(attemptsData)) setAttempts(attemptsData);
      if (Array.isArray(certsData)) setRealCertificates(certsData);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics Computations
  const totalAttempts = attempts.length;
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
  const averageScore = attempts.length > 0 
    ? Math.round((attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) * 10) / 10 
    : 0;
  // Certificate logic: earned if score >= 50
  const earnedCertificates = realCertificates; // Using real db certificates

  const calculateRank = () => {
    if (totalAttempts >= 5 && averageScore >= 80) return 'Rank #1 (Top 2%)';
    if (totalAttempts >= 3 && averageScore >= 60) return 'Rank #3 (Top 10%)';
    if (totalAttempts >= 1) return 'Rank #7 (Top 25%)';
    return 'Unranked';
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await updateProfile(user, { displayName });
      setProfileSuccess(true);
      setTimeout(() => {
        setProfileSuccess(false);
        setActiveModal('none');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError('Could not update profile name.');
    } finally {
      setProfileSaving(false);
    }
  };

  const scrollToQuizzes = () => {
    if (availableQuizzesRef.current) {
      availableQuizzesRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (quizzes.length > 0) {
      navigate(`/student/quizzes/${quizzes[0].id}`);
    }
  };

  
  const loadCertificatePreview = async (certId: string) => {
    setCertData(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/certificates/${certId}/download-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch certificate data');
      const { template, data } = await res.json();
      
      // Use backend studentName, or fallback to Firebase display name if not present
      if (data.studentEmail === user?.email) {
        data.studentName = data.studentName || displayName || user?.displayName || data.studentEmail.split('@')[0];
      }
      
      setCertData({ template, data });
    } catch (e) {
      console.error(e);
      alert('Could not load certificate preview');
    }
  };
  
  const handleDownloadPdf = async () => {
    if (!certData) return;
    const element = document.getElementById('certificate-preview-node-student-dash');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      doc.save(`Certificate_${certData.data.studentName}_${certData.data.quizTitle}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // Simulated Leaderboard Data
  const leaderboardData = [
    { rank: 1, name: 'Alex Johnson', score: 98, badge: '🥇 Gold', attempts: 14 },
    { rank: 2, name: 'Sophia Chen', score: 92, badge: '🥈 Silver', attempts: 12 },
    { rank: 3, name: displayName || user?.email?.split('@')[0] || 'You', score: Math.max(bestScore, 88), badge: '🥉 Bronze', isUser: true, attempts: totalAttempts || 5 },
    { rank: 4, name: 'Marcus Vance', score: 85, badge: 'Top 10%', attempts: 9 },
    { rank: 5, name: 'Emily Davis', score: 79, badge: 'Top 20%', attempts: 7 },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
        <div className="bg-slate-200 rounded-2xl h-44 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-200 rounded-xl h-24" />
          ))}
        </div>
        <div className="bg-slate-200 rounded-xl h-14 w-full" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-200 rounded-xl h-64" />
          <div className="bg-slate-200 rounded-xl h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Error Alert if data fetch failed */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Profile & Banner Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="w-16 h-16 rounded-full border-4 border-white/20 object-cover shadow-sm" 
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-500 border-2 border-indigo-300/40 flex items-center justify-center text-2xl font-black text-white shadow-inner uppercase">
                  {(displayName || user?.email || 'S').charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-indigo-700 rounded-full w-4 h-4" title="Active" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {displayName || user?.email?.split('@')[0]}
                </h1>
                <span className="bg-indigo-500/50 border border-indigo-300/30 text-indigo-100 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {dbUser?.role || 'Student'}
                </span>
              </div>
              <p className="text-indigo-200 text-sm flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5 text-indigo-300" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveModal('profile')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 backdrop-blur-sm transition-all text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Statistics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Attempted</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAttempts}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total quizzes taken</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Best Score</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{bestScore} <span className="text-xs font-normal text-slate-500">pts</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Highest achievement</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{averageScore} <span className="text-xs font-normal text-slate-500">pts</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Overall performance</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Certificates</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{earnedCertificates.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Passed certificates</div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rank Tier</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-extrabold text-indigo-600 truncate">{calculateRank()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Global leaderboard status</div>
        </div>
      </div>

      {/* Enter Quiz Code Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-lg">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Key className="w-4 h-4 text-indigo-400" />
              Join Quiz with Code
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Have a Quiz Code from your Instructor?</h3>
            <p className="text-slate-300 text-sm">
              Enter your unique alphanumeric quiz code (e.g., <span className="font-mono text-indigo-200 font-bold">DEV-7A92X</span>) to unlock instructions and start your exam instantly.
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={quizCodeInput}
                onChange={(e) => {
                  setQuizCodeInput(e.target.value.toUpperCase());
                  if (codeError) setCodeError(null);
                }}
                placeholder="Enter Code (e.g. DEV-7A92X)"
                className="w-full sm:w-64 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-slate-400 font-mono font-bold tracking-wider uppercase text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={joiningCode || !quizCodeInput.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
            >
              {joiningCode ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Join Quiz
                </>
              )}
            </button>
          </form>
        </div>

        {codeError && (
          <div className="mt-4 p-3.5 bg-red-500/20 border border-red-500/40 text-red-200 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{codeError}</span>
          </div>
        )}
      </div>

      {/* Quick Action Navigation Buttons Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3">Quick Actions:</span>
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          <button
            onClick={scrollToQuizzes}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
          >
            <PlayCircle className="w-4 h-4" /> Start Quiz
          </button>

          <button
            onClick={() => setActiveModal('results')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-slate-500" /> View Results
          </button>

          <button
            onClick={() => setActiveModal('leaderboard')}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-600" /> Leaderboard
          </button>

          <button
            onClick={() => setActiveModal('profile')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <User className="w-4 h-4 text-slate-500" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Main Content Grid: Available Quizzes & Recent Attempts */}
      <div className="grid md:grid-cols-2 gap-8" ref={availableQuizzesRef}>
        {/* Available Quizzes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              Available Quizzes
            </h2>
            <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
              {quizzes.length} Available
            </span>
          </div>

          <div className="space-y-3">
            {quizzes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PlayCircle className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-900 font-medium text-sm">No quizzes available right now.</p>
                <p className="text-slate-500 text-xs mt-1">Check back later when instructors publish new content.</p>
              </div>
            ) : (
              quizzes.map(quiz => (
                <div key={quiz.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all group flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{quiz.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Added {new Date(quiz.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Performance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              Recent Attempts
            </h2>
            {attempts.length > 0 && (
              <button 
                onClick={() => setActiveModal('results')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View all ({attempts.length})
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {attempts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-900 font-medium text-sm">No attempts recorded yet.</p>
                <p className="text-slate-500 text-xs mt-1">Complete a quiz to see your performance metrics here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {attempts.slice(0, 5).map(attempt => (
                  <li key={attempt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{attempt.quizTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{new Date(attempt.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(attempt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-sm font-bold text-indigo-600">{attempt.score} pts</span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Completed</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Edit Profile */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
                <p className="text-xs text-slate-500">Update your account information</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Profile name updated successfully!
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Display Name</label>
                <input 
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your Full Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Role</label>
                <input 
                  type="text"
                  disabled
                  value={dbUser?.role || 'Student'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 capitalize cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Detailed Results */}
      {activeModal === 'results' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quiz Attempt History</h3>
                <p className="text-xs text-slate-500">Full record of your completed assessments</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {attempts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No attempt records found.</div>
              ) : (
                attempts.map((attempt) => (
                  <div key={attempt.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{attempt.quizTitle}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(attempt.createdAt).toLocaleDateString()} at {new Date(attempt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                        {attempt.score} pts
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Passed
                      </span>
                      <button 
                        onClick={() => fetchReview(attempt.id)}
                        className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal('none')}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Review Attempt */}
      {activeModal === 'review' && reviewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setActiveModal('results'); setReviewData(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quiz Review: {reviewData.quiz.title}</h3>
                <p className="text-xs text-slate-500">Score: {reviewData.attempt.score} points</p>
              </div>
            </div>
            
            {reviewData.attempt.status === 'auto_submitted' && reviewData.attempt.violations > 0 && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
                <div>
                  <h4 className="font-bold text-sm">Certificate Denied due to Security Violations</h4>
                  <p className="text-xs opacity-90 mt-1">This quiz was automatically submitted due to multiple security violations. You are not eligible for a certificate for this attempt.</p>
                </div>
              </div>
            )}
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              {!reviewData.showAnswers && (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm mb-4">
                  The instructor has chosen not to display the correct answers for this quiz. You can only view your score.
                </div>
              )}
              {reviewData.quiz.questions.map((q: any, idx: number) => (
                <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">{idx + 1}. {q.content}</h4>
                  <div className="space-y-2">
                    {q.options.map((opt: any) => {
                      const isSelected = reviewData.userSelectedOptions.includes(opt.id);
                      const isCorrect = opt.isCorrect;
                      
                      let optClass = "border-slate-200 bg-white text-slate-700";
                      let icon = null;
                      
                      if (reviewData.showAnswers) {
                        if (isCorrect && isSelected) {
                          optClass = "border-emerald-500 bg-emerald-50 text-emerald-900";
                          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                        } else if (isCorrect && !isSelected) {
                          optClass = "border-emerald-300 bg-emerald-50 text-emerald-800";
                          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                        } else if (!isCorrect && isSelected) {
                          optClass = "border-red-500 bg-red-50 text-red-900";
                          icon = <X className="w-5 h-5 text-red-600" />;
                        }
                      } else {
                        if (isSelected) {
                          optClass = "border-indigo-500 bg-indigo-50 text-indigo-900";
                          icon = <CheckCircle2 className="w-5 h-5 text-indigo-600" />;
                        }
                      }
                      
                      return (
                        <div key={opt.id} className={`flex items-center justify-between p-3 rounded-lg border-2 ${optClass}`}>
                          <span className="font-medium">{opt.content}</span>
                          {icon}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL 3: Certificates */}
      {activeModal === 'certificates' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setActiveModal('none'); setSelectedCertificate(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Earned Certificates</h3>
                <p className="text-xs text-slate-500">Official certificates of completion</p>
              </div>
            </div>

            {selectedCertificate ? (
              <div className="flex-1 flex flex-col h-[600px] overflow-hidden space-y-4">
                {certData ? (
                  <div className="w-full flex-1 flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative">
                    <div 
                      className="relative bg-white shadow-sm"
                      style={{
                        width: '100%',
                        maxWidth: '800px',
                        aspectRatio: '297/210',
                        backgroundImage: certData.template.backgroundImage ? `url(${certData.template.backgroundImage})` : 'none',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        containerType: 'inline-size'
                      }}
                    >
                      {['studentName', 'studentEmail', 'quizTitle', 'score', 'percentage', 'rank', 'issueDate', 'certificateId'].map(field => {
                        const conf = certData.template.layoutConfig[field];
                        if (conf && conf.enabled && certData.data[field] !== undefined) {
                          return (
                            <div 
                              key={field}
                              style={{
                                position: 'absolute',
                                left: `${(conf.x / 297) * 100}%`,
                                top: `${(conf.y / 210) * 100}%`,
                                transform: `translate(${conf.align === 'center' ? '-50%' : conf.align === 'right' ? '-100%' : '0'}, -100%)`,
                                color: conf.color || '#000',
                                fontSize: `${conf.fontSize * 0.1187}cqi`,
                                whiteSpace: 'nowrap', fontStyle: conf.fontStyle === 'italic' ? 'italic' : 'normal', fontWeight: conf.fontStyle === 'bold' ? 'bold' : 'normal', fontFamily: conf.fontStyle === 'italic' ? 'serif' : 'sans-serif' 
                              }}
                            >
                              {certData.data[field]}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex-1 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => { setSelectedCertificate(null); setCertData(null); }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    ← Back to certificates list
                  </button>
                  {certData && (
                    <button
                      onClick={handleDownloadPdf}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {earnedCertificates.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No certificates available yet. Complete a quiz to earn certificates!
                  </div>
                ) : (
                  earnedCertificates.map((cert) => (
                    <div key={cert.id} className="py-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{cert.quizTitle}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued on {new Date(cert.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCertificate(cert);
                          loadCertificatePreview(cert.certificateId);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" /> View Certificate
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Leaderboard */}
      {activeModal === 'leaderboard' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Student Leaderboard</h3>
                <p className="text-xs text-slate-500">Top quiz performers this month</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {leaderboardData.map((item) => (
                <div 
                  key={item.rank}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    item.isUser 
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center ${
                      item.rank === 1 ? 'bg-amber-100 text-amber-800' :
                      item.rank === 2 ? 'bg-slate-200 text-slate-800' :
                      item.rank === 3 ? 'bg-amber-700/10 text-amber-900' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      #{item.rank}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {item.name}
                        {item.isUser && (
                          <span className="bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.attempts} quizzes taken</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-black text-indigo-600">{item.score} pts</div>
                    <div className="text-[10px] font-semibold text-slate-500">{item.badge}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal('none')}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Quiz Instructions & Confirmation */}
      {activeModal === 'quiz_instructions' && validatedQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setActiveModal('none'); setValidatedQuiz(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Quiz Code Validated
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{validatedQuiz.title}</h3>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-200/60 pb-2">
                <span className="flex items-center gap-1.5"><Key className="w-4 h-4 text-indigo-500" /> Quiz Code</span>
                <span className="font-mono font-bold text-indigo-700 text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{validatedQuiz.code}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-200/60 pb-2">
                <span className="flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-indigo-500" /> Total Questions</span>
                <span className="font-bold text-slate-900">{validatedQuiz.questionsCount || 0} Questions</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-500" /> Time Limit</span>
                <span className="font-bold text-slate-900">{validatedQuiz.timeLimit ? `${validatedQuiz.timeLimit} Minutes` : 'No Time Limit'}</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Exam Instructions:</h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>Ensure a stable internet connection before launching the test.</li>
                <li>Each question has multiple choice options; select the best response.</li>
                <li>Do not refresh or navigate away from the browser during the quiz.</li>
                <li>Your final score and detailed feedback will be calculated immediately upon submission.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setActiveModal('none'); setValidatedQuiz(null); }}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  navigate(`/student/quizzes/${validatedQuiz.id}`);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              >
                Start Test Now
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
