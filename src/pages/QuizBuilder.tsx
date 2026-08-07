import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, PlusCircle, Save, Trash2, CheckCircle2, GripVertical, Settings2, Copy, Check, Key, RefreshCw, Power, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Option {
  id?: number;
  content: string;
  isCorrect: boolean;
}

interface Question {
  id?: number;
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
  showCorrectAnswersAfterSubmit: boolean;
  enableScreenSharing?: boolean;
  enableMicrophone?: boolean;
  enableCamera?: boolean;
  enableFaceDetection?: boolean;
  enableMultiPerson?: boolean;
  enableDeviceDetection?: boolean;
  maxViolations?: number;
}

interface Quiz {
  id: number;
  title: string;
  status: string;
  code?: string;
  isCodeActive?: boolean;
  isPublic?: boolean;
  resultsReleased?: boolean;
  timeLimit?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  allowedAttempts?: number | null;
  questions: Question[];
  securitySettings?: SecuritySettings;
}

export function QuizBuilder() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [togglingCode, setTogglingCode] = useState(false);
  
  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  
  // State for new question being added
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState('multiple_choice');
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [newQuestionPoints, setNewQuestionPoints] = useState(1);
  const [newQuestionOptions, setNewQuestionOptions] = useState<Option[]>([
    { content: '', isCorrect: true },
    { content: '', isCorrect: false }
  ]);
  const [savingQuestion, setSavingQuestion] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id, user]);

  const fetchQuiz = async () => {
    if (!user || !id) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/quizzes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data) {
          setQuiz(data);
        } else {
          setError('Failed to parse quiz response');
        }
      } else {
        setError('Failed to load quiz');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!quiz?.code) return;
    navigator.clipboard.writeText(quiz.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleCodeStatus = async () => {
    if (!user || !quiz) return;
    setTogglingCode(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/quizzes/${quiz.id}/code-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isCodeActive: !quiz.isCodeActive
        })
      });
      if (response.ok) {
        const updated = await response.json().catch(() => null);
        if (updated) setQuiz({ ...quiz, isCodeActive: updated.isCodeActive });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingCode(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!user || !quiz) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Regenerate Quiz Code",
      message: "Regenerating code will invalidate the previous code. Are you sure you want to continue?",
      onConfirm: async () => {
        try {
          const token = await user.getIdToken();
          const response = await fetch(`/api/v1/quizzes/${quiz.id}/regenerate-code`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const updated = await response.json().catch(() => null);
            if (updated) setQuiz({ ...quiz, code: updated.code, isCodeActive: updated.isCodeActive });
          }
        } catch (err) {
          console.error(err);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleUpdateSettings = async (newSettings: Partial<SecuritySettings>) => {
    if (!user || !quiz) return;
    const updatedSettings = {
      ...quiz.securitySettings,
      ...newSettings
    } as SecuritySettings;
    
    // Optimistic UI update
    setQuiz({ ...quiz, securitySettings: updatedSettings });
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ securitySettings: updatedSettings })
      });
      if (!response.ok) {
         // Revert on error
         const text = await response.text();
         console.error('Failed to update settings', text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOption = () => {
    setNewQuestionOptions([...newQuestionOptions, { content: '', isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (newQuestionOptions.length <= 2) return;
    const updated = [...newQuestionOptions];
    updated.splice(index, 1);
    // Ensure at least one correct option if we removed the only one
    if (!updated.some(o => o.isCorrect)) {
      updated[0].isCorrect = true;
    }
    setNewQuestionOptions(updated);
  };

  const handleOptionContentChange = (index: number, content: string) => {
    const updated = [...newQuestionOptions];
    updated[index].content = content;
    setNewQuestionOptions(updated);
  };

  const handleOptionCorrectChange = (index: number) => {
    const updated = [...newQuestionOptions];
    if (newQuestionType === 'multiple_choice') {
      // Only one correct answer
      updated.forEach((o, i) => o.isCorrect = i === index);
    } else {
      updated[index].isCorrect = !updated[index].isCorrect;
    }
    setNewQuestionOptions(updated);
  };

  const handleSaveQuestion = async () => {
    if (!newQuestionContent.trim() || !user || !quiz) return;
    
    // Validation
    if (newQuestionType === 'multiple_choice' || newQuestionType === 'true_false') {
      if (newQuestionOptions.some(o => !o.content.trim())) {
         alert('All options must have content.');
         return;
      }
      if (!newQuestionOptions.some(o => o.isCorrect)) {
         alert('At least one option must be marked as correct.');
         return;
      }
    }

    setSavingQuestion(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/quizzes/${quiz.id}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: newQuestionType,
          content: newQuestionContent,
          points: newQuestionPoints,
          optionsData: newQuestionOptions
        })
      });

      if (response.ok) {
        const savedQuestion = await response.json().catch(() => null);
        if (savedQuestion) {
          setQuiz({
            ...quiz,
            questions: [...quiz.questions, savedQuestion]
          });
        }
        toast.success("Question saved successfully!");
        
        // Reset form
        setIsAddingQuestion(false);
        setNewQuestionContent('');
        setNewQuestionPoints(1);
        setNewQuestionOptions([
          { content: '', isCorrect: true },
          { content: '', isCorrect: false }
        ]);
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(`Failed to save question: ${err.error || response.statusText}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error saving question: ${err.message}`);
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!user || !quiz || !questionId) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Delete Question",
      message: "Are you sure you want to delete this question? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/v1/quizzes/${quiz.id}/questions/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            setQuiz({
              ...quiz,
              questions: quiz.questions.filter(q => q.id !== questionId)
            });
          } else {
            console.error('Failed to delete question');
          }
        } catch (err) {
          console.error(err);
        }
        setConfirmModal(null);
      }
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading quiz builder...</div>;
  if (error || !quiz) return <div className="p-8 text-center text-red-500">{error || 'Quiz not found'}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/quizzes" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{quiz.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                quiz.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {quiz.status}
              </span>
              <span className="text-slate-500 text-sm">{quiz.questions.length} Questions</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 transition-all text-slate-700">
            Preview
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-all">
            Publish Quiz
          </button>
        </div>
      </div>

      {/* Quiz Code Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-indigo-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Key className="w-4 h-4" />
            Quiz Access Code
          </div>
          <p className="text-slate-300 text-sm">
            Share this code with students to let them join and complete this assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 font-mono text-2xl font-black tracking-widest text-indigo-200 select-all">
            {quiz.code || 'DEV-7A92X'}
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-95"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>

          <button
            onClick={handleToggleCodeStatus}
            disabled={togglingCode}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-xl border transition-all ${
              quiz.isCodeActive !== false
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
            }`}
            title="Toggle Code Active State"
          >
            <Power className="w-4 h-4" />
            {quiz.isCodeActive !== false ? 'Code Active' : 'Code Disabled'}
          </button>

          <button
            onClick={handleRegenerateCode}
            className="p-3 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
            title="Regenerate Quiz Code"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quiz Security Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 mb-6">
        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-500" />
          Quiz Settings & Security
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-900">Quiz Start Time</label>
            <div className="text-xs text-slate-500 mb-1">Optional. Students cannot start before this.</div>
            <input
              type="datetime-local"
              value={quiz.startTime ? new Date(quiz.startTime).toISOString().slice(0, 16) : ''}
              onChange={async (e) => {
                 const val = e.target.value;
                 const startTime = val ? new Date(val).toISOString() : null;
                 setQuiz({ ...quiz, startTime });
                 try {
                   const token = await user?.getIdToken();
                   await fetch(`/api/v1/quizzes/${quiz.id}`, {
                     method: 'PATCH',
                     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify({ startTime })
                   });
                 } catch(err) { console.error(err); }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-900">Quiz End Time</label>
            <div className="text-xs text-slate-500 mb-1">Optional. Quiz auto-closes at this time.</div>
            <input
              type="datetime-local"
              value={quiz.endTime ? new Date(quiz.endTime).toISOString().slice(0, 16) : ''}
              onChange={async (e) => {
                 const val = e.target.value;
                 const endTime = val ? new Date(val).toISOString() : null;
                 setQuiz({ ...quiz, endTime });
                 try {
                   const token = await user?.getIdToken();
                   await fetch(`/api/v1/quizzes/${quiz.id}`, {
                     method: 'PATCH',
                     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify({ endTime })
                   });
                 } catch(err) { console.error(err); }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-900">Time Limit (Minutes)</label>
            <div className="text-xs text-slate-500 mb-1">Leave empty for no time limit.</div>
            <input
              type="number"
              min="1"
              value={quiz.timeLimit || ''}
              onChange={async (e) => {
                 const timeLimit = e.target.value ? parseInt(e.target.value) : null;
                 setQuiz({ ...quiz, timeLimit });
                 try {
                   const token = await user?.getIdToken();
                   await fetch(`/api/v1/quizzes/${quiz.id}`, {
                     method: 'PATCH',
                     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify({ timeLimit })
                   });
                 } catch(err) { console.error(err); }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="e.g. 60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-900">Allowed Attempts</label>
            <div className="text-xs text-slate-500 mb-1">Maximum attempts per participant.</div>
            <input
              type="number"
              min="1"
              value={quiz.allowedAttempts || 1}
              onChange={async (e) => {
                 const allowedAttempts = e.target.value ? parseInt(e.target.value) : 1;
                 setQuiz({ ...quiz, allowedAttempts });
                 try {
                   const token = await user?.getIdToken();
                   await fetch(`/api/v1/quizzes/${quiz.id}`, {
                     method: 'PATCH',
                     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify({ allowedAttempts })
                   });
                 } catch(err) { console.error(err); }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Public / Private */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.isPublic || false}
                onChange={async (e) => {
                   const isPublic = e.target.checked;
                   setQuiz({ ...quiz, isPublic });
                   try {
                     const token = await user?.getIdToken();
                     await fetch(`/api/v1/quizzes/${quiz.id}`, {
                       method: 'PATCH',
                       headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                       body: JSON.stringify({ isPublic })
                     });
                   } catch(err) { console.error(err); }
                }}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Public Quiz</div>
              <div className="text-xs text-slate-500">If checked, students do not need a code to see and start this quiz.</div>
            </div>
          </label>

          {/* Release Results */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.resultsReleased || false}
                onChange={async (e) => {
                   const resultsReleased = e.target.checked;
                   setQuiz({ ...quiz, resultsReleased });
                   try {
                     const token = await user?.getIdToken();
                     await fetch(`/api/v1/quizzes/${quiz.id}`, {
                       method: 'PATCH',
                       headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                       body: JSON.stringify({ resultsReleased })
                     });
                   } catch(err) { console.error(err); }
                }}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Release Results</div>
              <div className="text-xs text-slate-500">Allow participants to see their scores, analytics, and certificates.</div>
            </div>
          </label>

          {/* Fullscreen Mode */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.securitySettings?.fullscreen || false}
                onChange={(e) => handleUpdateSettings({ fullscreen: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Fullscreen Mode</div>
              <div className="text-xs text-slate-500">Require students to take the quiz in fullscreen.</div>
            </div>
          </label>

          {/* Tab Blur */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.securitySettings?.tabBlur || false}
                onChange={(e) => handleUpdateSettings({ tabBlur: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Detect Tab Switching</div>
              <div className="text-xs text-slate-500">Record a violation if the student switches tabs.</div>
            </div>
          </label>

          {/* Copy/Paste */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.securitySettings?.copyPaste || false}
                onChange={(e) => handleUpdateSettings({ copyPaste: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Disable Copy/Paste</div>
              <div className="text-xs text-slate-500">Prevent text selection and clipboard shortcuts.</div>
            </div>
          </label>

          {/* Randomize Questions */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.securitySettings?.randomizeQuestions || false}
                onChange={(e) => handleUpdateSettings({ randomizeQuestions: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Randomize Questions</div>
              <div className="text-xs text-slate-500">Shuffle question order for each student.</div>
            </div>
          </label>

          {/* Randomize Options */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.securitySettings?.randomizeOptions || false}
                onChange={(e) => handleUpdateSettings({ randomizeOptions: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Randomize Options</div>
              <div className="text-xs text-slate-500">Shuffle answers within each question.</div>
            </div>
          </label>

          {/* Show Correct Answers After Submission */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={quiz.securitySettings?.showCorrectAnswersAfterSubmit || false}
                onChange={(e) => handleUpdateSettings({ showCorrectAnswersAfterSubmit: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Show Correct Answers</div>
              <div className="text-xs text-slate-500">Show correct answers after submission.</div>
            </div>
          </label>

          {/* Online Proctoring Settings */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-4 col-span-full">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" /> Online Proctoring (AI)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.securitySettings?.enableScreenSharing || false}
                    onChange={(e) => handleUpdateSettings({ enableScreenSharing: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Enable Screen Sharing</div>
                  <div className="text-xs text-slate-500">Require students to share their entire screen.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.securitySettings?.enableCamera || false}
                    onChange={(e) => handleUpdateSettings({ enableCamera: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Enable Camera Monitoring</div>
                  <div className="text-xs text-slate-500">Require webcam feed during the quiz.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.securitySettings?.enableMicrophone || false}
                    onChange={(e) => handleUpdateSettings({ enableMicrophone: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Enable Microphone Monitoring</div>
                  <div className="text-xs text-slate-500">Require microphone access.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.securitySettings?.enableFaceDetection || false}
                    onChange={(e) => handleUpdateSettings({ enableFaceDetection: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Enable Face Detection</div>
                  <div className="text-xs text-slate-500">Detect if student leaves the camera frame.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.securitySettings?.enableMultiPerson || false}
                    onChange={(e) => handleUpdateSettings({ enableMultiPerson: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Enable Multiple Person Detection</div>
                  <div className="text-xs text-slate-500">Detect if more than one person is in the frame.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.securitySettings?.enableDeviceDetection || false}
                    onChange={(e) => handleUpdateSettings({ enableDeviceDetection: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Enable Device Detection</div>
                  <div className="text-xs text-slate-500">Detect mobile phones, tablets, or books.</div>
                </div>
              </label>

              <div className="flex flex-col gap-1 col-span-full mt-2">
                <label className="text-sm font-semibold text-slate-900">Maximum Security Violations</label>
                <div className="text-xs text-slate-500 mb-1">Quiz auto-submits after this many violations (default 2).</div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={quiz.securitySettings?.maxViolations || 2}
                  onChange={(e) => handleUpdateSettings({ maxViolations: parseInt(e.target.value) || 2 })}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, qIndex) => (
          <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
              <div className="mt-1 cursor-grab opacity-30 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    <span className="text-indigo-600 mr-2">{qIndex + 1}.</span>
                    {q.content}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded border border-slate-200">
                      {q.points} pt{q.points !== 1 ? 's' : ''}
                    </span>
                    <button 
                      onClick={() => q.id && handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors bg-white border border-slate-200 shadow-sm"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {q.options.map((opt, oIndex) => (
                    <div 
                      key={opt.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                        opt.isCorrect 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                        opt.isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                      }`}>
                        {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-medium">{opt.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isAddingQuestion ? (
          <div className="bg-indigo-50/30 rounded-xl border-2 border-indigo-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
              <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-500" />
                Configure New Question
              </h3>
              <button 
                onClick={() => setIsAddingQuestion(false)}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Question Text</label>
                <textarea
                  value={newQuestionContent}
                  onChange={(e) => setNewQuestionContent(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm min-h-[120px] resize-y"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Question Type</label>
                  <select
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm bg-white"
                  >
                    <option value="multiple_choice">Multiple Choice (Single Answer)</option>
                    <option value="multiple_select">Multiple Select (Multi Answer)</option>
                    <option value="true_false">True / False</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuestionPoints}
                    onChange={(e) => setNewQuestionPoints(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-indigo-100">
              <label className="block text-sm font-semibold text-slate-700">Answer Options</label>
              
              {newQuestionOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <button
                    onClick={() => handleOptionCorrectChange(idx)}
                    className={`w-10 h-10 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                      opt.isCorrect 
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20' 
                        : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400'
                    }`}
                    title="Toggle Correct Answer"
                  >
                    <CheckCircle2 className={`w-5 h-5 ${opt.isCorrect ? 'opacity-100' : 'opacity-30'}`} />
                  </button>
                  <input
                    type="text"
                    value={opt.content}
                    onChange={(e) => handleOptionContentChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-all shadow-sm focus:outline-none focus:ring-2 ${
                      opt.isCorrect 
                        ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-500' 
                        : 'border-slate-300 bg-white focus:ring-indigo-500'
                    }`}
                  />
                  {newQuestionOptions.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleAddOption}
                className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Add Option
              </button>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={handleSaveQuestion}
                disabled={savingQuestion}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                Save Question
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingQuestion(true)}
            className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mb-3 transition-colors">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm">Add New Question</span>
            <span className="text-xs mt-1 text-slate-400 group-hover:text-indigo-400">Multiple choice, true/false, or multi-select</span>
          </button>
        )}
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
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
