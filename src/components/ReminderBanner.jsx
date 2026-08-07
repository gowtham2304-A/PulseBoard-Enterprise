import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export function ReminderBanner({ reconsiderationTasks, onResolveReconsideration }) {
  if (!reconsiderationTasks || reconsiderationTasks.length === 0) return null;

  return (
    <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-900 animate-fadeIn">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-rose-100 text-rose-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
        </div>
        <span className="font-semibold text-rose-900">
          AI Alert: {reconsiderationTasks.length} task(s) flagged for Reconsideration due to regression check.
        </span>
      </div>

      <div className="flex items-center gap-2">
        {reconsiderationTasks.map((t) => (
          <button
            key={t.id}
            onClick={() => onResolveReconsideration(t.id)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100/60 font-semibold text-[11px] transition-all shadow-2xs"
          >
            <span>Resolve {t.key || t.title}</span>
            <ArrowRight className="w-3 h-3 text-rose-500" />
          </button>
        ))}
      </div>
    </div>
  );
}
