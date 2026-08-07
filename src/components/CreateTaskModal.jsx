import React, { useState } from 'react';
import { X, Plus, Crown, Clock } from 'lucide-react';

export function CreateTaskModal({ isOpen, onClose, onAddTask, members }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(members[1]?.name || 'Khidmat');
  const [label, setLabel] = useState('Feature');
  const [deadlineHours, setDeadlineHours] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const deadlineIso = deadlineHours
      ? new Date(Date.now() + parseFloat(deadlineHours) * 60 * 60 * 1000).toISOString()
      : null;

    const newTask = {
      id: `task-${Date.now()}`,
      key: `PLS-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      description: description.trim() || 'No description provided.',
      status: 'todo',
      assignee,
      assigneeAvatar: members.find(m => m.name === assignee)?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      priority: 'medium',
      label,
      last_summary: 'Task created by Manager.',
      reconsideration_reason: '',
      last_updated: 'Just now',
      deadline: deadlineIso,
      confidence: 'high'
    };

    onAddTask(newTask);
    setTitle('');
    setDescription('');
    setDeadlineHours('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading text-slate-900">Create New Task</h2>
              <p className="text-xs text-slate-500">Assign task with deadline for live Git tracking</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build User Profile Settings Page"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Requirements</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide technical context for the developer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Deadline Setting */}
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
            <label className="block text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Manager Deadline (hours from now)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(e.target.value)}
                placeholder="e.g. 10 (leave blank = no deadline)"
                className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400 transition-all"
              />
              {deadlineHours && (
                <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">
                  Due: {new Date(Date.now() + parseFloat(deadlineHours || 0) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className="text-[10px] text-amber-600 mt-1">
              🤖 AI will auto-escalate to HIGH priority if &lt;1 hour remains
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Developer</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <input
                type="text"
                value="🤖 AI Auto-Scored"
                disabled
                className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category Label</label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Security">Security</option>
                <option value="Database">Database</option>
                <option value="Feature">Feature</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
