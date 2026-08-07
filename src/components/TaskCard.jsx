import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Clock, Timer } from 'lucide-react';
import { SetDeadlineModal } from './SetDeadlineModal';

// Returns { label, colorClass, hoursLeft, isUrgent, isOverdue }
function getDeadlineInfo(deadline, status) {
  if (!deadline || status === 'done') return null;
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return { label: 'OVERDUE', colorClass: 'bg-red-600 text-white border-red-700 animate-pulse', hoursLeft: diffHours, isUrgent: true, isOverdue: true };
  } else if (diffHours < 1) {
    const mins = Math.ceil(diffHours * 60);
    return { label: `${mins}m left`, colorClass: 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse', hoursLeft: diffHours, isUrgent: true, isOverdue: false };
  } else if (diffHours < 3) {
    return { label: `${diffHours.toFixed(1)}h left`, colorClass: 'bg-amber-100 text-amber-700 border-amber-300', hoursLeft: diffHours, isUrgent: false, isOverdue: false };
  } else {
    return { label: `${diffHours.toFixed(1)}h left`, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', hoursLeft: diffHours, isUrgent: false, isOverdue: false };
  }
}

export function TaskCard({ task, onTaskClick, onManualMove, columns, onSimulateInactivity, onSetDeadline }) {
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const isReconsideration = task.status === 'reconsideration';

  const isStale = React.useMemo(() => {
    if (task.status === 'done' || !task.last_activity_time) return false;
    const diffHours = (new Date() - new Date(task.last_activity_time)) / (1000 * 60 * 60);
    return diffHours >= 10;
  }, [task.last_activity_time, task.status]);

  const deadlineInfo = React.useMemo(() => getDeadlineInfo(task.deadline, task.status), [task.deadline, task.status]);

  // Auto-escalate priority when deadline is urgent
  const effectivePriority = deadlineInfo?.isUrgent ? 'high' : task.priority;

  const priorityBadge = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div
      onClick={() => onTaskClick(task)}
      className={`group relative enterprise-card rounded-2xl p-3 cursor-pointer transition-all w-full min-h-[140px] flex flex-col justify-between ${
        isReconsideration ? 'border-rose-300 bg-rose-50/40 shadow-sm' : ''
      } ${isStale ? 'border-amber-300 bg-amber-50/20 shadow-sm' : ''} ${
        deadlineInfo?.isUrgent ? 'border-rose-400 bg-rose-50/30 shadow-rose-100 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
            {task.key || 'PLS-101'}
          </span>
          {task.label && (
            <span className="px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 bg-slate-100 rounded border border-slate-200">
              {task.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {deadlineInfo && (
            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border flex items-center gap-0.5 ${deadlineInfo.colorClass}`}>
              <Timer className="w-2.5 h-2.5" />
              {deadlineInfo.label}
            </span>
          )}
          <span
            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
              priorityBadge[effectivePriority] || priorityBadge.medium
            }`}
          >
            {deadlineInfo?.isUrgent ? '🔴 HIGH' : effectivePriority}
          </span>
        </div>
      </div>

      <h3 className="task-title font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2 font-heading">
        {task.title}
      </h3>

      {/* Urgent Deadline Warning */}
      {deadlineInfo?.isUrgent && (
        <div className="mb-2.5 p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-[10px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="font-bold">
            {deadlineInfo.isOverdue ? '🚨 DEADLINE OVERDUE — Manager has been notified!' : `⚡ Deadline in ${deadlineInfo.label} — Priority escalated to HIGH!`}
          </span>
        </div>
      )}

      {/* 10-Hour Inactivity Warning */}
      {isStale && !deadlineInfo?.isUrgent && (
        <div className="mb-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold text-amber-800">⚠️ Inactive for 10h+</span>
        </div>
      )}

      {isReconsideration && (
        <div className="mb-2.5 p-2 rounded-lg bg-rose-100/80 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-900 text-[10px]">Reconsideration Flagged</div>
            <div className="text-[10px] text-rose-800 leading-tight mt-0.5">
              {task.reconsideration_reason || 'AI flagged regression in code diff.'}
            </div>
          </div>
        </div>
      )}

      {task.last_summary && (
        <div className="mb-2.5 p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 text-[11px] flex items-start gap-1.5 max-h-[48px] overflow-hidden">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <span className="italic text-slate-600 text-[10px] leading-tight truncate">"{task.last_summary}"</span>
        </div>
      )}

      {/* Set Deadline button + status move */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={task.assigneeAvatar}
            alt={task.assignee}
            className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
            title={task.assignee}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[90px]">
              {task.assignee}
            </span>
            <div className="flex gap-2">
              {!isStale && task.status !== 'done' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSimulateInactivity(task.id);
                  }}
                  className="text-[8px] text-blue-600 hover:underline font-bold text-left"
                >
                  Simulate 10h Idle
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeadlineModal(true);
                }}
                className="text-[8px] text-amber-600 hover:underline font-bold flex items-center gap-0.5"
              >
                <Clock className="w-2.5 h-2.5" />
                {task.deadline ? 'Edit Deadline' : 'Set Deadline'}
              </button>
            </div>
          </div>
        </div>

        <select
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onManualMove(task.id, e.target.value);
          }}
          value={task.status}
          className="bg-slate-50 text-slate-700 text-[10px] rounded px-1.5 py-0.5 border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              Move: {col.title}
            </option>
          ))}
        </select>
      </div>

      {/* Deadline Modal — rendered inline, stops propagation */}
      {showDeadlineModal && (
        <div onClick={(e) => e.stopPropagation()}>
          <SetDeadlineModal
            task={task}
            isOpen={showDeadlineModal}
            onClose={() => setShowDeadlineModal(false)}
            onSave={(taskId, deadlineIso) => {
              onSetDeadline(taskId, deadlineIso);
              setShowDeadlineModal(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
