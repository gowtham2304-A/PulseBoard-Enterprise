import React from 'react';
import { X, CheckCircle2, Clock, AlertTriangle, Timer, Flame } from 'lucide-react';

function getDeadlineUrgency(deadline, status) {
  if (!deadline || status === 'done') return { hoursLeft: Infinity, label: null, isUrgent: false, isOverdue: false };
  const end = new Date(deadline);
  if (isNaN(end.getTime())) return { hoursLeft: Infinity, label: null, isUrgent: false, isOverdue: false };
  const diffMs = end - new Date();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 0) return { hoursLeft: diffHours, label: 'OVERDUE', isUrgent: true, isOverdue: true };
  if (diffHours < 1) return { hoursLeft: diffHours, label: `${Math.ceil(diffHours * 60)}m left`, isUrgent: true, isOverdue: false };
  return { hoursLeft: diffHours, label: `${diffHours.toFixed(1)}h left`, isUrgent: false, isOverdue: false };
}

export function TaskReminderFlashCard({ isOpen, onClose, tasks, currentUser }) {
  if (!isOpen || !currentUser || currentUser.isManager) return null;

  const activeTasks = tasks.filter(
    (t) => t.assignee === currentUser.name && t.status !== 'done'
  );

  // Sort by urgency: overdue first, then by hours remaining
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const da = getDeadlineUrgency(a.deadline, a.status);
    const db = getDeadlineUrgency(b.deadline, b.status);
    if (da.hoursLeft !== db.hoursLeft) return da.hoursLeft - db.hoursLeft;
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  const urgentCount = sortedTasks.filter(t => getDeadlineUrgency(t.deadline, t.status).isUrgent).length;

  const priorityColor = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800 flex flex-col">

        {/* Header */}
        <div className={`px-5 pt-5 pb-4 ${urgentCount > 0 ? 'bg-rose-50 border-b border-rose-200' : 'border-b border-slate-100'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
              />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {urgentCount > 0 ? `⚡ Urgent! ${urgentCount} deadline${urgentCount > 1 ? 's' : ''} approaching` : `Welcome back, ${currentUser.name}!`}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {sortedTasks.length > 0
                    ? `${sortedTasks.length} task${sortedTasks.length > 1 ? 's' : ''} pending — sorted by urgency`
                    : 'All your tasks are complete!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="p-4 flex-1 space-y-2.5 max-h-[340px] overflow-y-auto">
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task, index) => {
              const dl = getDeadlineUrgency(task.deadline, task.status);
              const effectivePriority = dl.isUrgent ? 'high' : task.priority;

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    dl.isOverdue
                      ? 'bg-red-50 border-red-300'
                      : dl.isUrgent
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                      <span className="font-mono text-[10px] font-bold text-blue-600">{task.key}</span>
                      {dl.isOverdue && <Flame className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-1">
                      {dl.label && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5 ${
                          dl.isOverdue ? 'bg-red-600 text-white border-red-700' :
                          dl.isUrgent ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <Timer className="w-2.5 h-2.5" />
                          {dl.label}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${priorityColor[effectivePriority] || priorityColor.medium}`}>
                        {effectivePriority}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">{task.title}</div>
                  {dl.isOverdue && (
                    <div className="text-[10px] text-red-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      This task is overdue! Manager has been alerted.
                    </div>
                  )}
                  {dl.isUrgent && !dl.isOverdue && (
                    <div className="text-[10px] text-rose-700 font-semibold">
                      ⚡ Less than 1 hour remaining — start immediately!
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 capitalize">
                    Status: <strong className="text-slate-700">{task.status.replace('_', ' ')}</strong>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <strong className="text-slate-800 text-xs">All clear!</strong>
                <p className="text-[11px] text-slate-500 mt-0.5">No pending tasks right now.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Tasks sorted by deadline urgency</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
          >
            Got it, start working
          </button>
        </div>
      </div>
    </div>
  );
}
