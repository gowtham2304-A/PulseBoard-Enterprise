import React from 'react';
import { X, Clock, AlertTriangle, ShieldAlert, ChevronRight } from 'lucide-react';

function getDeadlineInfo(deadline, status) {
  if (!deadline || status === 'done') return null;
  const diffMs = new Date(deadline) - new Date();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 0) return { isOverdue: true, label: 'OVERDUE', hoursLeft: diffHours };
  if (diffHours < 1) return { isOverdue: false, label: `${Math.ceil(diffHours * 60)}m left`, hoursLeft: diffHours };
  return null;
}

const MEMBER_INITIAL_COLORS = {
  Gowtham: 'bg-indigo-600 text-white',
  Vansh: 'bg-blue-600 text-white',
  Khidmat: 'bg-emerald-600 text-white',
};

export function DeadlineAlertModal({ isOpen, onClose, tasks, currentUser, onSelectTask }) {
  if (!isOpen || !currentUser) return null;

  // Filter tasks with urgent/overdue deadlines
  const urgentTasks = tasks.filter(t => {
    const dl = getDeadlineInfo(t.deadline, t.status);
    return dl !== null;
  });

  if (urgentTasks.length === 0) return null;

  const isManager = currentUser.isManager;

  // For Employee: only show tasks assigned to this employee
  const employeeUrgentTasks = urgentTasks.filter(t => t.assignee === currentUser.name);

  // Group tasks by Employee Name (for Manager View)
  const groupedByEmployee = urgentTasks.reduce((acc, t) => {
    const key = t.assignee || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // If employee has no urgent tasks, don't show modal for employee
  if (!isManager && employeeUrgentTasks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-rose-200/80 shadow-2xl overflow-hidden text-slate-800 flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 px-5 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-heading">
                {isManager ? '⏰ Manager Alert — Employee Overdue Tasks' : '🚨 URGENT DEADLINE ALERT — Action Required'}
              </h2>
              <p className="text-[11px] text-rose-100 mt-0.5">
                {isManager
                  ? `${urgentTasks.length} task${urgentTasks.length > 1 ? 's' : ''} require immediate manager oversight`
                  : `You have ${employeeUrgentTasks.length} task${employeeUrgentTasks.length > 1 ? 's' : ''} past or near deadline`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[62vh] overflow-y-auto space-y-4 bg-slate-50/50">
          {/* MANAGER VIEW: Grouped by Employee */}
          {isManager ? (
            Object.entries(groupedByEmployee).map(([employeeName, memberTasks]) => {
              const initialColor = MEMBER_INITIAL_COLORS[employeeName] || 'bg-slate-700 text-white';

              return (
                <div key={employeeName} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {/* Employee Header Banner */}
                  <div className="bg-slate-100/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-200/70">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shadow-sm ${initialColor}`}>
                        {employeeName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 font-heading">Employee: {employeeName}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      {memberTasks.length} Task{memberTasks.length > 1 ? 's' : ''} Overdue
                    </span>
                  </div>

                  {/* Employee Tasks List */}
                  <div className="p-3 space-y-2">
                    {memberTasks.map(t => {
                      const dl = getDeadlineInfo(t.deadline, t.status);
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (onSelectTask) onSelectTask(t);
                            onClose();
                          }}
                          className="group p-3 rounded-xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-blue-400 cursor-pointer transition-all shadow-2xs flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                                {t.key}
                              </span>
                              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                {t.title}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>Status: <strong className="uppercase text-slate-700">{t.status.replace('_', ' ')}</strong></span>
                              <span>·</span>
                              <span>Priority: <strong className="uppercase text-rose-600">{t.priority}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-2xs ${
                              dl?.isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {dl?.label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            /* EMPLOYEE / DEVELOPER VIEW: Direct Personal Alert List */
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 mb-1">
                Please update your task status or notify your engineering manager:
              </div>
              {employeeUrgentTasks.map(t => {
                const dl = getDeadlineInfo(t.deadline, t.status);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (onSelectTask) onSelectTask(t);
                      onClose();
                    }}
                    className="group p-3.5 rounded-xl bg-white border border-rose-200 hover:border-rose-400 cursor-pointer transition-all shadow-sm flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                          {t.key}
                        </span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                          {t.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Assigned to you: <strong className="text-slate-900">{t.assignee}</strong> · Priority: <strong className="uppercase text-rose-600">{t.priority}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 ${
                        dl?.isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-rose-100 text-rose-800'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {dl?.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {isManager ? '📢 Manager Oversight Protocol Active' : '⚡ Developer Action Required'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
