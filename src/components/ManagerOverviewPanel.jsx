import React, { useMemo } from 'react';
import { X, CheckCircle2, Clock, AlertTriangle, Timer, TrendingUp, User } from 'lucide-react';

function getDeadlineInfo(deadline, status) {
  if (!deadline || status === 'done') return null;
  const end = new Date(deadline);
  if (isNaN(end.getTime())) return null;
  const diffMs = end - new Date();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 0) return { label: 'OVERDUE', isOverdue: true, isUrgent: true, hoursLeft: diffHours };
  if (diffHours < 1) return { label: `${Math.ceil(diffHours * 60)}m left`, isOverdue: false, isUrgent: true, hoursLeft: diffHours };
  return { label: `${diffHours.toFixed(1)}h left`, isOverdue: false, isUrgent: false, hoursLeft: diffHours };
}

export function ManagerOverviewPanel({ isOpen, onClose, tasks, teamMembers }) {
  if (!isOpen) return null;

  const memberStats = useMemo(() => {
    return teamMembers.map(member => {
      const memberTasks = tasks.filter(t => t.assignee === member.name);
      const done = memberTasks.filter(t => t.status === 'done');
      const active = memberTasks.filter(t => t.status !== 'done');
      const overdue = active.filter(t => {
        const dl = getDeadlineInfo(t.deadline, t.status);
        return dl?.isOverdue;
      });
      const urgent = active.filter(t => {
        const dl = getDeadlineInfo(t.deadline, t.status);
        return dl?.isUrgent && !dl?.isOverdue;
      });
      const completionRate = memberTasks.length > 0
        ? Math.round((done.length / memberTasks.length) * 100)
        : 0;

      return {
        ...member,
        total: memberTasks.length,
        done: done.length,
        active,
        overdue,
        urgent,
        completionRate,
        allTasks: memberTasks,
      };
    });
  }, [tasks, teamMembers]);

  const totalOverdue = memberStats.reduce((a, m) => a + m.overdue.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${totalOverdue > 0 ? 'bg-rose-50 border-rose-200' : 'border-slate-100'}`}>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Manager Overview — Team Progress
              {totalOverdue > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                  {totalOverdue} OVERDUE
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Full task breakdown for every developer you have assigned
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Overview Cards */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">

          {/* Global alerts — overdue tasks from all members */}
          {totalOverdue > 0 && (
            <div className="p-3.5 rounded-xl border border-red-300 bg-red-50 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900">
                <strong>Action Required:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {memberStats.flatMap(m => m.overdue.map(t => (
                    <li key={t.id}>
                      <strong>{m.name}</strong> has missed the deadline for <strong>"{t.title}"</strong>
                    </li>
                  )))}
                </ul>
              </div>
            </div>
          )}

          {memberStats.map(member => (
            <div key={member.id} className="border border-slate-200 rounded-xl overflow-hidden">

              {/* Member Header */}
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      member.name?.startsWith('V')
                        ? 'bg-blue-600 text-white'
                        : member.name?.startsWith('K')
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{member.name}</div>
                    <div className="text-[10px] text-slate-500">{member.role}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    ✅ {member.done}/{member.total} Done ({member.completionRate}%)
                  </span>
                  {member.overdue.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 font-bold animate-pulse">
                      🚨 {member.overdue.length} Overdue
                    </span>
                  )}
                  {member.urgent.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                      ⚡ {member.urgent.length} Urgent
                    </span>
                  )}
                </div>
              </div>

              {/* Completion Bar */}
              <div className="px-4 py-2 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{member.completionRate}%</span>
                </div>
              </div>

              {/* Task List for this member */}
              <div className="divide-y divide-slate-100">
                {member.allTasks.length === 0 ? (
                  <div className="px-4 py-3 text-[11px] text-slate-400 italic">No tasks assigned</div>
                ) : (
                  member.allTasks.map(task => {
                    const dl = getDeadlineInfo(task.deadline, task.status);
                    return (
                      <div
                        key={task.id}
                        className={`px-4 py-2.5 flex items-center justify-between gap-3 text-[11px] ${
                          dl?.isOverdue ? 'bg-red-50' : dl?.isUrgent ? 'bg-rose-50/50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {task.status === 'done' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : dl?.isOverdue ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="font-mono text-[10px] text-blue-600 font-bold shrink-0">{task.key}</span>
                          <span className={`truncate font-medium ${
                            task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {dl && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5 ${
                              dl.isOverdue ? 'bg-red-600 text-white border-red-700' :
                              dl.isUrgent ? 'bg-rose-100 text-rose-700 border-rose-300' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              <Timer className="w-2.5 h-2.5" />
                              {dl.label}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            task.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            task.status === 'reconsideration' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[10px] text-slate-400">
            Data synced live from MongoDB Atlas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
