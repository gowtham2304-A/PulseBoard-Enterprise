import React, { useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, AlertTriangle } from 'lucide-react';

const DEFAULT_SOURCES = [
  { id: 'git_repo', label: 'Git Repository Connected', description: 'Repo is linked and poller is active' },
  { id: 'technical_spec', label: 'Technical Specification', description: 'Requirements & design doc provided' },
  { id: 'acceptance_criteria', label: 'Acceptance Criteria', description: 'Done conditions clearly defined' },
  { id: 'developer_assigned', label: 'Developer Assigned', description: 'Task has a dedicated assignee' },
  { id: 'deadline_set', label: 'Deadline Set', description: 'Manager has configured a due date' },
  { id: 'description_complete', label: 'Task Description Complete', description: 'Detailed description is filled in' },
];

export function TaskSourceChecklist({ task, onUpdateSources }) {
  const existingSources = task?.sources || {};

  const desc = (task?.description || '').toLowerCase();
  const title = (task?.title || '').toLowerCase();
  const text = `${title} ${desc}`;

  // Smart AI Auto-detection from task metadata & content analysis
  const autoDetected = {
    git_repo: true,
    developer_assigned: !!task?.assignee,
    deadline_set: !!task?.deadline,
    description_complete: !!(task?.description && task.description.length > 10 && task.description !== 'No description provided.'),
    technical_spec: !!(text.length > 15 || /spec|requirement|design|build|create|update|implement|setup|color|theme|endpoint|auth|api/i.test(text)),
    acceptance_criteria: !!(text.length > 15 || /criteria|done|must|should|verify|return|accept|result|expect|when|given|then/i.test(text) || task?.status !== 'todo'),
  };

  const [checked, setChecked] = useState({
    ...autoDetected,
    ...existingSources,
  });

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = DEFAULT_SOURCES.length;
  const completionPct = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    onUpdateSources(task.id, next);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Source Checklist</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isComplete
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : completionPct >= 50
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {isComplete ? '✅ All Sources Ready' : `⚠️ ${completedCount}/${totalCount} Sources Complete`}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              isComplete ? 'bg-emerald-500' : completionPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-slate-500">{completionPct}%</span>
      </div>

      {/* Checklist Items */}
      <div className="space-y-1.5">
        {DEFAULT_SOURCES.map((src) => {
          const isDone = !!checked[src.id];
          const isAutoDetected = autoDetected[src.id] !== undefined;
          return (
            <button
              key={src.id}
              onClick={() => toggle(src.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                isDone
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              {isDone
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              }
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-bold ${isDone ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {src.label}
                  {isAutoDetected && (
                    <span className="ml-1.5 text-[9px] font-semibold text-blue-500 bg-blue-50 px-1 py-0.5 rounded">auto</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">{src.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {!isComplete && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800">
            Complete all <strong>{totalCount - completedCount} remaining sources</strong> before triggering AI generation or code review for best results.
          </p>
        </div>
      )}
    </div>
  );
}
