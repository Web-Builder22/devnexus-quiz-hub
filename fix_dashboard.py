import re

with open('src/pages/AnalyticsDashboard.tsx', 'r') as f:
    content = f.read()

# find the broken part at the end
broken_str = """        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
            {selectedImage && ("""

if broken_str in content:
    content = content.replace(broken_str, """        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class Average</p>
            <p className="text-2xl font-black text-slate-900">{averageScore} <span className="text-sm font-normal text-slate-500">pts</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across all quizzes</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attempts per Quiz */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              Attempts per Quiz
            </h3>
            <span className="text-xs font-medium text-slate-500">Total: {totalAttempts} attempts</span>
          </div>
          <div className="h-[280px] w-full">
            {quizzes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quizzes.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="title" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '...' : val} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="attemptsCount" name="Attempts" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No attempt data available</div>
            )}
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Class Performance Trends
            </h3>
            <span className="text-xs font-medium text-slate-500">Weekly Score Trajectory</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Security Violations Log */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 overflow-hidden mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Security Violations Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Recent suspicious activities and constraint breaches during active attempts.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 px-4 pl-2">Time</th>
                <th className="pb-3 px-4">Student</th>
                <th className="pb-3 px-4">Quiz</th>
                <th className="pb-3 px-4">Violation Details</th>
                <th className="pb-3 px-4">Proof</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {violations.map((log, i) => (
                <tr key={log.id} className="hover:bg-red-50/50 transition-colors">
                  <td className="py-3.5 px-4 pl-2 text-slate-500 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{log.studentEmail}</td>
                  <td className="py-3.5 px-4 text-slate-700">{log.quizTitle}</td>
                  <td className="py-3.5 px-4 text-red-600 font-medium">{log.details}</td>
                  <td className="py-3.5 px-4">
                    {log.snapshotImage && (
                      <button onClick={() => setSelectedImage(log.snapshotImage)} className="text-indigo-600 hover:underline text-xs flex items-center gap-1">
                        View Image
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {violations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No security violations recorded recently.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-xl p-2 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 px-2">
              <h3 className="font-semibold text-slate-900">Violation Snapshot</h3>
              <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={selectedImage} alt="Violation Snapshot" className="w-full h-auto rounded-lg object-contain bg-slate-900 max-h-[70vh]" />
          </div>
        </div>
      )}

    </div>
  );
}
""")

with open('src/pages/AnalyticsDashboard.tsx', 'w') as f:
    f.write(content)

