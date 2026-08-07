import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';

export function TaskCard({ task, onTaskClick, onManualMove, columns }) {
  const isReconsideration = task.status === 'reconsideration';

  const priorityBadge = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div
      onClick={() => onTaskClick(task)}
      className={`group relative enterprise-card rounded-xl p-4 cursor-pointer transition-all ${
        isReconsideration ? 'border-rose-300 bg-rose-50/40 shadow-sm' : ''
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

        <span
          className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
            priorityBadge[task.priority] || priorityBadge.medium
          }`}
        >
          {task.priority}
        </span>
      </div>

      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2 font-heading">
        {task.title}
      </h3>

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
        <div className="mb-2.5 p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 text-[11px] flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <span className="italic text-slate-600 text-[10px] leading-tight">
            "{task.last_summary}"
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <img
            src={task.assigneeAvatar}
            alt={task.assignee}
            className="w-5 h-5 rounded-full object-cover border border-slate-200"
            title={task.assignee}
          />
          <span className="text-[11px] font-medium text-slate-700 truncate max-w-[85px]">
            {task.assignee}
          </span>
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
    </div>
  );
}
