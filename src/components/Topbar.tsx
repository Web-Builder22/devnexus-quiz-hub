import React, { useState } from 'react';
import { Bell, Search, Menu, UserCheck, Shield, GraduationCap, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { dbUser, updateRole } = useAuth();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentRole = dbUser?.role || 'student';

  const handleRoleSelect = async (newRole: string) => {
    setShowRoleMenu(false);
    await updateRole(newRole);
    if (newRole === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 shrink-0 transition-all duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-900">Quiz System</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          <span className="font-medium text-indigo-600 capitalize">{currentRole} Portal</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search quizzes..." 
            className="bg-slate-100 border-none text-xs rounded-full py-2 pl-9 pr-4 w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 text-slate-700"
          />
        </div>

        {/* Role Switcher Badge */}
        <div className="relative">
          <button 
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="capitalize">{currentRole}</span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Active Role
              </div>
              <button
                onClick={() => handleRoleSelect('student')}
                className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-slate-50 ${currentRole === 'student' ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'}`}
              >
                <GraduationCap className="w-4 h-4" /> Student View
              </button>
              <button
                onClick={() => handleRoleSelect('admin')}
                className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-slate-50 ${currentRole === 'admin' ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'}`}
              >
                <Shield className="w-4 h-4" /> Admin View
              </button>
            </div>
          )}
        </div>

        {/* Notifications Popup Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-50"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">3 New</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <p className="font-semibold text-slate-800">🎉 Quiz Published</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">"React Fundamentals" is now available to attempt.</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <p className="font-semibold text-slate-800">🏆 Certificate Ready</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Your certificate for JavaScript Quiz is generated.</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <p className="font-semibold text-slate-800">⚡ Live Multiplayer Room</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Join the live quiz session hosted by instructor.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
