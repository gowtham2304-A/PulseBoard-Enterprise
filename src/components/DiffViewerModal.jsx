import React, { useState } from 'react';
import { X, GitCommit, FileCode, CheckCircle2, AlertTriangle, Sparkles, ClipboardList } from 'lucide-react';
import { TaskSourceChecklist } from './TaskSourceChecklist';

export function DiffViewerModal({ task, commitLog, onClose, onUpdateSources }) {
  const [activeTab, setActiveTab] = useState('details');

  if (!task) return null;

  const matchedLog = commitLog.find(
    (log) => log.matchedTaskId === task.id || log.matchedTask === task.title
  );

  const sources = task?.sources || {};
  const totalSources = 6;
  const completedSources = Object.values(sources).filter(Boolean).length;

  const tabs = [
    { id: 'details', label: 'Task Details', icon: FileCode },
    { id: 'checklist', label: `Sources (${completedSources}/${totalSources})`, icon: ClipboardList },
    { id: 'commit', label: 'Git Commit', icon: GitCommit },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {task.key || 'PLS-101'}
                </span>
                <span className="text-xs font-semibold text-slate-500">{task.label || 'Feature'}</span>
                {completedSources === totalSources ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✅ All Sources Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ⚠️ {completedSources}/{totalSources} Sources
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold font-heading text-slate-900 mt-0.5">
                {task.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200 bg-slate-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <>
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Assignee</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{task.assignee}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Current Status</div>
                  <div className="font-semibold text-blue-600 uppercase mt-0.5">{task.status}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Priority</div>
                  <div className="font-semibold text-slate-800 uppercase mt-0.5">{task.priority}</div>
                </div>
              </div>

              {task.description && task.description !== 'No description provided.' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Description</div>
                  <p className="text-slate-700 leading-relaxed">{task.description}</p>
                </div>
              )}

              {task.last_summary && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>AI Automated Reasoning</span>
                  </div>
                  <p className="text-blue-900 leading-relaxed italic">"{task.last_summary}"</p>
                </div>
              )}

              {task.status === 'reconsideration' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Security Regression Flagged</span>
                  </div>
                  <p className="text-rose-800">
                    {task.reconsideration_reason || 'Commit introduced unhandled exception in core module.'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── CHECKLIST TAB (Core Bounty) ── */}
          {activeTab === 'checklist' && (
            <TaskSourceChecklist task={task} onUpdateSources={onUpdateSources} />
          )}

          {/* ── COMMIT TAB ── */}
          {activeTab === 'commit' && (
            matchedLog ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <GitCommit className="w-4 h-4 text-blue-600" />
                    <span>Matched Git Commit</span>
                  </span>
                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    #{matchedLog.sha}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800 pb-2">
                    <span>Author: <strong className="text-slate-200">{matchedLog.author}</strong></span>
                    <span>{matchedLog.timestamp || 'Recent'}</span>
                  </div>
                  <div className="text-blue-300 font-semibold pt-1">
                    Commit Msg: "{matchedLog.message}"
                  </div>
                  <div className="text-emerald-400 text-[11px]">
                    Shift: {matchedLog.statusShift || `➔ ${task.status}`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50 font-mono">
                Waiting for live git commit stream...
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
