import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Library, 
  Users, 
  Settings,
  BarChart,
  LogOut,
  BrainCircuit,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const { dbUser, signOut } = useAuth();
  
  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Quiz Management', path: '/quizzes', icon: Library },
    { name: 'Create Quiz', path: '/quizzes/new', icon: BrainCircuit },
    { name: 'Analytics & Results', path: '/analytics', icon: BarChart },
    { name: 'Certificates', path: '/admin/certificates', icon: Award },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Certificates', path: '/student/certificates', icon: Award },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const links = (dbUser?.role === 'student') ? studentLinks : adminLinks;

  return (
    <aside 
      className={cn(
        "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#0f172a] text-slate-300 border-r border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0 lg:ml-0" : "-translate-x-full lg:-ml-64"
      )}
    >
      <Link 
        to="/dashboard" 
        className="p-6 flex items-center gap-3 hover:opacity-90 transition-opacity"
      >
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">DevNexus</span>
      </Link>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-2 mb-2 pt-2">
          {dbUser?.role === 'student' ? 'Learning' : 'Management'}
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => {
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-800 text-slate-300'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-indigo-400 border-2 border-indigo-200/20 flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
            {dbUser?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{dbUser?.email || 'User'}</div>
            <div className="text-[10px] text-slate-400 truncate uppercase">{dbUser?.role || 'Student'}</div>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-colors shrink-0 ml-auto"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
