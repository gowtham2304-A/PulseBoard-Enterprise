import React, { useState } from 'react';
import { X, Clock, Trash2, Timer } from 'lucide-react';

export function SetDeadlineModal({ task, isOpen, onClose, onSave }) {
  const [hours, setHours] = useState('');
  const [mode, setMode] = useState('hours'); // 'hours' | 'datetime'
  const [datetime, setDatetime] = useState('');

  if (!isOpen) return null;

  const currentDeadline = task?.deadline ? new Date(task.deadline) : null;

  const handleSave = () => {
    let deadlineIso = null;
    if (mode === 'hours' && hours) {
      deadlineIso = new Date(Date.now() + parseFloat(hours) * 3600000).toISOString();
    } else if (mode === 'datetime' && datetime) {
      deadlineIso = new Date(datetime).toISOString();
    }
    if (!deadlineIso) return;
    onSave(task?.id || task?._id, deadlineIso);
    setHours('');
    setDatetime('');
    onClose();
  };

  const handleRemove = () => {
    onSave(task?.id || task?._id, null);
    onClose();
  };

  const previewTime = mode === 'hours' && hours
    ? new Date(Date.now() + parseFloat(hours) * 3600000).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Set Deadline</h3>
              <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{task?.key} — {task?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current deadline (if exists) */}
        {currentDeadline && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-800">
              <Timer className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold">Current:</span>
              <span>{currentDeadline.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-800 font-bold"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="px-5 pt-4 pb-1 flex gap-2">
          <button
            onClick={() => setMode('hours')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              mode === 'hours'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            Hours from now
          </button>
          <button
            onClick={() => setMode('datetime')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              mode === 'datetime'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            Exact date & time
          </button>
        </div>

        {/* Input */}
        <div className="px-5 py-4 space-y-3">
          {mode === 'hours' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hours from now
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 10 (= 10 hours from now)"
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              {previewTime && (
                <p className="text-[11px] text-blue-600 font-semibold mt-1.5 flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  Due at: {previewTime}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select exact date & time
              </label>
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            🤖 PulseBoard will auto-escalate this task to <strong>HIGH priority</strong> when less than 1 hour remains.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={mode === 'hours' ? !hours : !datetime}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-all"
          >
            Set Deadline
          </button>
        </div>
      </div>
    </div>
  );
}
