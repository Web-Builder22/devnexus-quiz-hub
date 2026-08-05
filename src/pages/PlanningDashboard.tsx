import React from 'react';
import { CheckCircle2, ShieldAlert, BookOpen, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PlanningDashboard() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Planning: Final Phase</h1>
          <p className="text-slate-500 text-sm">All Modules Completed Successfully</p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-all">Launch Application</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm h-fit">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Implementation Timeline</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Step 1-8: Planning</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Module 1: Auth & RBAC</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Module 2: Admin UI</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Module 3: Student UI</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Module 4: Live Engine</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Module 5: Analytics</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="md:col-span-3 space-y-6 flex-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 tracking-tight">Module 5 Outcomes (Analytics & Reporting)</span>
                <div className="text-[10px] text-slate-500 font-medium">Global analytics dashboard and secure reporting API completed.</div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Implemented Features</h4>
                <ul className="text-[11px] text-slate-600 space-y-1.5 font-mono">
                  <li>- Analytics API (`/api/v1/analytics`)</li>
                  <li>- Real-time chart visualization with Recharts</li>
                  <li>- Global statistics computation</li>
                  <li>- Role-based Analytics Dashboard UI</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Data Modeling</h4>
                <ul className="text-[11px] text-slate-600 space-y-1.5 font-mono">
                  <li>- Complex Drizzle aggregation queries</li>
                  <li>- Left Joins for per-quiz statistics</li>
                  <li>- Time-sorted recent activity feed</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-emerald-50/50 rounded-xl p-6 border border-emerald-100 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 tracking-tight mb-2">Application Complete!</h3>
            <p className="text-sm text-emerald-700/80 mb-0 max-w-lg">
              All core components of DevNexus are now fully functional. The admin workflows, student quiz taking, real-time live engine, and analytics dashboards are ready to use. 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

