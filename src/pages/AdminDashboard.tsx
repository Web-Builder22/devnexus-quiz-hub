import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  BookOpen, 
  Users, 
  BarChart2, 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Award, 
  Sparkles, 
  Activity,
  Edit3,
  TrendingUp,
  Zap,
  Shield
} from 'lucide-react';

export function AdminDashboard() {
  const { token, user, dbUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const safeFetch = async (url: string) => {
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) {
          const text = await r.text();
          console.warn(`Fetch ${url} returned HTTP ${r.status}:`, text);
          return null;
        }
        return await r.json();
      } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return null;
      }
    };

    Promise.all([
      safeFetch('/api/v1/analytics/overview'),
      safeFetch('/api/v1/analytics/quizzes'),
      safeFetch('/api/v1/analytics/recent'),
    ])
      .then(([overviewData, quizzesData, recentData]) => {
        setOverview(overviewData || {});
        setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
        setRecentSubmissions(Array.isArray(recentData) ? recentData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load admin dashboard data:', err);
        setError('Could not fetch admin dashboard metrics.');
        setLoading(false);
      });
  }, [token]);

  const adminName = user?.displayName || user?.email?.split('@')[0] || 'Admin';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
        <div className="bg-slate-200 rounded-2xl h-44 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-200 rounded-xl h-24" />
          ))}
        </div>
        <div className="bg-slate-200 rounded-xl h-20 w-full" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-200 rounded-xl h-64" />
          <div className="bg-slate-200 rounded-xl h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 border-2 border-indigo-400/40 flex items-center justify-center text-2xl font-black text-white shadow-inner uppercase">
              {adminName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Welcome back, {adminName}
                </h1>
                <span className="bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Instructor
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Manage quizzes, monitor student submissions, and analyze classroom engagement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/quizzes/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all text-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Create New Quiz
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Quizzes</span>
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{overview?.totalQuizzes || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Published assessments</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Students</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{overview?.totalStudents || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Registered participants</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Submissions</span>
            <CheckCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{overview?.totalAttempts || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Completed quiz attempts</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Class Score</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{overview?.avgScore || 0} <span className="text-xs font-normal text-slate-500">pts</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Overall class benchmark</p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Instructor Actions:</span>
        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
          <Link
            to="/quizzes/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Create Quiz
          </Link>

          <Link
            to="/quizzes"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <BookOpen className="w-4 h-4 text-slate-500" /> Manage Quizzes
          </Link>

          <Link
            to="/quizzes"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Users className="w-4 h-4 text-slate-500" /> View Participants
          </Link>

          <Link
            to="/analytics"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" /> Review Results & Analytics
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Managed Quizzes List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Active Quizzes
            </h2>
            <Link to="/quizzes" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              Manage All ({quizzes.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {quizzes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-slate-900 font-medium text-sm">No quizzes published yet.</p>
                <p className="text-slate-500 text-xs mt-1">Create your first quiz to start engaging students.</p>
                <Link
                  to="/quizzes/new"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                >
                  <PlusCircle className="w-4 h-4" /> Create Quiz Now
                </Link>
              </div>
            ) : (
              quizzes.slice(0, 5).map(quiz => (
                <div key={quiz.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{quiz.title}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      {quiz.code && (
                        <span className="font-mono font-bold text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                          {quiz.code}
                        </span>
                      )}
                      <span>•</span>
                      <span>{quiz.attemptsCount || 0} attempts</span>
                      <span>•</span>
                      <span>Avg: {quiz.avgScore || 0} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/quizzes/${quiz.id}/edit`}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      title="Edit Quiz"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/analytics"
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      Analytics
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Submissions Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Latest Submissions
            </h2>
            <Link to="/analytics" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No recent student submissions.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentSubmissions.slice(0, 5).map((submission, idx) => (
                  <li key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        {submission.studentName || submission.studentDisplayName || submission.studentEmail?.split('@')[0]}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Completed <span className="font-medium text-slate-800">{submission.quizTitle}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-indigo-600">{submission.score} pts</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
