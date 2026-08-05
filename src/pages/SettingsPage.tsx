import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, GraduationCap, Shield } from 'lucide-react';

export function SettingsPage() {
  const { dbUser, updateRole, user } = useAuth();
  const [role, setRole] = useState(dbUser?.role || 'student');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await updateRole(role);
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences and role.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="text" 
                disabled 
                value={user?.email || ''} 
                className="w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
            
            <div className="pt-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Account Role</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <button
                  onClick={() => setRole('student')}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${role === 'student' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <GraduationCap className={`w-8 h-8 ${role === 'student' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className={`font-semibold ${role === 'student' ? 'text-indigo-900' : 'text-slate-700'}`}>Student</span>
                </button>
                <button
                  onClick={() => setRole('admin')}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${role === 'admin' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <Shield className={`w-8 h-8 ${role === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className={`font-semibold ${role === 'admin' ? 'text-indigo-900' : 'text-slate-700'}`}>Admin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {success ? <span className="text-emerald-600 font-medium">Settings saved successfully!</span> : 'Changes will be saved to your account.'}
          </p>
          <button
            onClick={handleSave}
            disabled={loading || role === dbUser?.role}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
