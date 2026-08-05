import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Search, Edit2, Play, Trash2, Copy, Check, Key, Power, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Quiz {
  id: number;
  title: string;
  status: string;
  code?: string;
  isCodeActive?: boolean;
  createdAt: string;
}

export function QuizList() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Custom Modals
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, quizId: number} | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  const fetchQuizzes = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/v1/quizzes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json().catch(() => []);
        setQuizzes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuizzes(prev => prev.filter(q => q.id !== quizId));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to delete quiz: ${data.error || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting quiz');
    }
  };

  const handleCopyCode = (id: number, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleCodeStatus = async (quiz: Quiz) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const newStatus = quiz.isCodeActive === false;
      const response = await fetch(`/api/v1/quizzes/${quiz.id}/code-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isCodeActive: newStatus })
      });
      if (response.ok) {
        setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, isCodeActive: newStatus } : q));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading quizzes...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Quizzes</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your created quizzes and assessments.</p>
        </div>
        <Link 
          to="/quizzes/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Create Quiz
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search quizzes..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"
            />
          </div>
          <select className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quiz Code</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <PlusCircle className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No quizzes yet</p>
                      <p className="text-xs text-slate-500 mt-1">Create your first quiz to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quizzes.map(quiz => (
                  <tr key={quiz.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{quiz.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">ID: {quiz.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm bg-slate-100 text-indigo-700 px-2.5 py-1 rounded border border-slate-200">
                          {quiz.code || 'N/A'}
                        </span>
                        <button
                          onClick={() => handleCopyCode(quiz.id, quiz.code)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                          title="Copy Code"
                        >
                          {copiedId === quiz.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          quiz.status === 'published' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                        </span>
                        <button
                          onClick={() => handleToggleCodeStatus(quiz)}
                          className={`p-1 rounded text-xs border transition-colors ${
                            quiz.isCodeActive !== false 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}
                          title="Toggle Code Status"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/quizzes/${quiz.id}/results`} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors" title="View Results">
                          <Users className="w-4 h-4" />
                        </Link>
                        <Link to={`/quizzes/${quiz.id}/edit`} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors" title="Edit Quiz">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {quiz.status === 'published' && (
                          <Link to={`/quizzes/${quiz.id}/live`} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md transition-colors" title="Live Proctoring Dashboard">
                            <Shield className="w-4 h-4" />
                          </Link>
                        )}
                        <button onClick={() => handleDelete(quiz.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
