import React from 'react';
import { X, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react';

export function TaskReminderFlashCard({ isOpen, onClose, tasks, currentUser }) {
  if (!isOpen || !currentUser || currentUser.isManager) return null;

  // Filter tasks assigned to the current employee that are not completed
  const activeTasks = tasks.filter(
    (t) => t.assignee === currentUser.name && t.status !== 'done'
  );

  // Sort by priority (high first)
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  const sortedTasks = [...activeTasks].sort(
    (a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800 p-6 flex flex-col animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Welcome Back, {currentUser.name}!</h2>
              <p className="text-[11px] text-slate-500">Here is your active workspace checklist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {sortedTasks.length > 0 ? (
            <>
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>You have **{sortedTasks.length}** pending tasks. Focus on high priority items:</span>
              </div>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {sortedTasks.map((task) => {
                  const priorityColor = {
                    high: 'bg-rose-50 text-rose-700 border-rose-200',
                    medium: 'bg-amber-50 text-amber-700 border-amber-200',
                    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  };

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-blue-600">
                          {task.key || 'PLS-101'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            priorityColor[task.priority] || priorityColor.medium
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        Status: <strong className="text-slate-700">{task.status.replace('_', ' ')}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <strong className="text-slate-800">All clear!</strong>
                <p className="text-[11px] text-slate-500 mt-0.5">No pending tasks assigned to you right now.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 active:scale-98 transition-all"
          >
            Got it, start working
          </button>
        </div>

      </div>
    </div>
  );
}
