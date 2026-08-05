import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function QuizNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [allowedAttempts, setAllowedAttempts] = useState<string>('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const parsedTimeLimit = timeLimit.trim() ? parseInt(timeLimit.trim(), 10) : null;
      const parsedAllowedAttempts = allowedAttempts.trim() ? parseInt(allowedAttempts.trim(), 10) : 1;

      const response = await fetch('/api/v1/quizzes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: title.trim(),
          timeLimit: isNaN(Number(parsedTimeLimit)) ? null : parsedTimeLimit,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
          allowedAttempts: isNaN(Number(parsedAllowedAttempts)) ? 1 : parsedAllowedAttempts
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.id) {
        navigate(`/quizzes/${data.id}/edit`);
      } else {
        setError(data?.error || `Failed to create quiz (${response.statusText || response.status})`);
      }
    } catch (err: any) {
      console.error('Error creating quiz:', err);
      setError(err?.message || 'An unexpected error occurred while creating the quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/quizzes" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Quiz</h1>
          <p className="text-slate-500 text-sm mt-1">Start by giving your quiz a title.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700">Quiz Title</label>
            <input
              id="title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Physics Assessment"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="startTime" className="block text-sm font-semibold text-slate-700">Quiz Start Time <span className="text-slate-400 font-normal">- Optional</span></label>
              <input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="endTime" className="block text-sm font-semibold text-slate-700">Quiz End Time <span className="text-slate-400 font-normal">- Optional</span></label>
              <input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="timeLimit" className="block text-sm font-semibold text-slate-700">Time Limit (Minutes) <span className="text-slate-400 font-normal">- Optional</span></label>
              <input
                id="timeLimit"
                type="number"
                min="1"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="Leave empty for no time limit"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="allowedAttempts" className="block text-sm font-semibold text-slate-700">Allowed Attempts <span className="text-slate-400 font-normal">- Optional</span></label>
              <input
                id="allowedAttempts"
                type="number"
                min="1"
                value={allowedAttempts}
                onChange={(e) => setAllowedAttempts(e.target.value)}
                placeholder="Leave empty for 1 attempt"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Create & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
