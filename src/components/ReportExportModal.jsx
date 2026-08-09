import React, { useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';

function formatDeadline(deadline) {
  if (!deadline) return 'No deadline set';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return 'No deadline set';
  return d.toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getDeadlineStatus(deadline, status) {
  if (!deadline || status === 'done') return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const diffHours = (d - new Date()) / 3600000;
  if (diffHours <= 0) return 'OVERDUE';
  if (diffHours < 1) return 'CRITICAL';
  if (diffHours < 3) return 'URGENT';
  return 'ON TRACK';
}

export function ReportExportModal({ isOpen, onClose, tasks, teamMembers }) {
  const [mode, setMode] = useState('project'); // 'project' | 'task'
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [format, setFormat] = useState('html');

  if (!isOpen) return null;

  const selectedTask = tasks.find(t => t.id === selectedTaskId || t._id === selectedTaskId);

  // ── Generate task-specific HTML report ──────────────────────────────────────
  const generateTaskHTML = (task) => {
    const sources = task.sources || {};
    const sourceItems = [
      { id: 'git_repo', label: 'Git Repository Connected' },
      { id: 'technical_spec', label: 'Technical Specification' },
      { id: 'acceptance_criteria', label: 'Acceptance Criteria' },
      { id: 'developer_assigned', label: 'Developer Assigned' },
      { id: 'deadline_set', label: 'Deadline Set' },
      { id: 'description_complete', label: 'Task Description Complete' },
    ];
    const completedSources = Object.values(sources).filter(Boolean).length;
    const dl = task.deadline ? getDeadlineStatus(task.deadline, task.status) : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PulseBoard Task Report — ${task.key || 'PLS'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    .header { background: linear-gradient(135deg, #1d4ed8, #4f46e5); color: white; padding: 32px; border-radius: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; font-weight: 800; }
    .header .meta { font-size: 13px; opacity: 0.8; margin-top: 8px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .card h2 { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .field-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }
    .checklist-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; }
    .checklist-item.done { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .checklist-item.pending { background: #fafafa; border: 1px solid #e2e8f0; }
    .check { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
    .check.done { background: #22c55e; color: white; }
    .check.pending { background: #e2e8f0; color: #94a3b8; }
    .ai-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; }
    .ai-box p { font-size: 13px; color: #1e40af; font-style: italic; line-height: 1.6; }
    .warn { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #92400e; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 32px; }
    @media print { body { background: white; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:12px;opacity:0.7;margin-bottom:6px">PulseBoard Enterprise — Task Audit Report</div>
        <h1>${task.title}</h1>
        <div class="meta">
          ${task.key || 'PLS'} &nbsp;·&nbsp; ${task.label || 'Feature'} &nbsp;·&nbsp;
          Generated: ${new Date().toLocaleString()}
        </div>
      </div>
      <span class="badge" style="background:rgba(255,255,255,0.2);color:white;font-size:13px">
        ${(task.status || '').toUpperCase().replace('_', ' ')}
      </span>
    </div>
  </div>

  <div class="card">
    <h2>Task Overview</h2>
    <div class="grid-2">
      <div><div class="field-label">Assignee</div><div class="field-value">${task.assignee || '—'}</div></div>
      <div><div class="field-label">Priority</div><div class="field-value">${(task.priority || '').toUpperCase()}</div></div>
      <div><div class="field-label">Deadline</div><div class="field-value">${formatDeadline(task.deadline)}</div></div>
      <div><div class="field-label">Deadline Status</div><div class="field-value">${dl || 'N/A'}</div></div>
      <div><div class="field-label">Last Activity</div><div class="field-value">${task.last_activity_time ? new Date(task.last_activity_time).toLocaleString() : '—'}</div></div>
      <div><div class="field-label">AI Confidence</div><div class="field-value">${(task.confidence || 'Medium').toUpperCase()}</div></div>
    </div>
    ${task.description ? `<div style="margin-top:14px"><div class="field-label">Description</div><div style="margin-top:4px;font-size:13px;color:#334155;line-height:1.6">${task.description}</div></div>` : ''}
  </div>

  <div class="card">
    <h2>Source Checklist (${completedSources}/6)</h2>
    ${sourceItems.map(s => {
      const done = !!sources[s.id];
      return `<div class="checklist-item ${done ? 'done' : 'pending'}">
        <div class="check ${done ? 'done' : 'pending'}">${done ? '✓' : '○'}</div>
        <span style="font-size:12px;font-weight:600;color:${done ? '#15803d' : '#64748b'}">${s.label}</span>
      </div>`;
    }).join('')}
    ${completedSources < 6 ? `<div class="warn" style="margin-top:10px">⚠️ ${6 - completedSources} source(s) are missing. Complete the checklist before final review.</div>` : ''}
  </div>

  ${task.last_summary ? `<div class="card">
    <h2>🤖 AI Automated Reasoning</h2>
    <div class="ai-box"><p>"${task.last_summary}"</p></div>
  </div>` : ''}

  ${task.status === 'reconsideration' ? `<div class="card" style="border-color:#fca5a5;background:#fff5f5">
    <h2 style="color:#dc2626">🚨 Security Regression Detected</h2>
    <p style="font-size:13px;color:#7f1d1d">${task.reconsideration_reason || 'AI flagged a regression in the latest code diff.'}</p>
  </div>` : ''}

  <div class="footer">
    Generated by PulseBoard Enterprise &nbsp;·&nbsp; ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
  };

  // ── Generate project CSV ─────────────────────────────────────────────────────
  const generateProjectCSV = () => {
    const headers = ['Task Key', 'Title', 'Assignee', 'Status', 'Priority', 'Category', 'Deadline', 'Deadline Status', 'Sources Complete', 'AI Summary', 'Last Active'];
    const rows = tasks.map(t => [
      t.key || 'N/A',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.assignee || '',
      (t.status || '').toUpperCase(),
      (t.priority || '').toUpperCase(),
      t.label || 'N/A',
      t.deadline ? new Date(t.deadline).toLocaleString() : 'No deadline',
      getDeadlineStatus(t.deadline, t.status) || 'N/A',
      `${Object.values(t.sources || {}).filter(Boolean).length}/6`,
      `"${(t.last_summary || '').replace(/"/g, '""')}"`,
      t.last_activity_time ? new Date(t.last_activity_time).toLocaleString() : 'N/A',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  // ── Generate project HTML executive report ────────────────────────────────────
  const generateProjectHTML = () => {
    const memberStats = teamMembers.map(m => {
      const mtasks = tasks.filter(t => t.assignee === m.name);
      const done = mtasks.filter(t => t.status === 'done').length;
      const overdue = mtasks.filter(t => getDeadlineStatus(t.deadline, t.status) === 'OVERDUE').length;
      return { ...m, total: mtasks.length, done, overdue, rate: mtasks.length > 0 ? Math.round((done / mtasks.length) * 100) : 0 };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PulseBoard Project Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    .header { background: linear-gradient(135deg, #0f172a, #1e3a8a); color: white; padding: 32px; border-radius: 16px; margin-bottom: 24px; }
    h1 { font-size: 26px; font-weight: 800; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .card h2 { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .bar-track { background: #f1f5f9; border-radius: 999px; height: 8px; }
    .bar-fill { height: 8px; border-radius: 999px; background: #3b82f6; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size:12px;opacity:0.7;margin-bottom:8px">PulseBoard Enterprise — Executive Project Report</div>
    <h1>Project Status Overview</h1>
    <div style="font-size:13px;opacity:0.7;margin-top:8px">
      Total Tasks: ${tasks.length} &nbsp;·&nbsp; Completed: ${tasks.filter(t => t.status === 'done').length} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()}
    </div>
  </div>

  <div class="card">
    <h2>Team Performance</h2>
    <table>
      <tr><th>Developer</th><th>Total</th><th>Done</th><th>Overdue</th><th>Completion</th></tr>
      ${memberStats.map(m => `<tr>
        <td><strong>${m.name}</strong><br><span style="font-size:10px;color:#94a3b8">${m.role}</span></td>
        <td>${m.total}</td>
        <td style="color:#16a34a;font-weight:700">${m.done}</td>
        <td style="color:${m.overdue > 0 ? '#dc2626' : '#64748b'};font-weight:700">${m.overdue}</td>
        <td style="width:140px"><div class="bar-track"><div class="bar-fill" style="width:${m.rate}%"></div></div><span style="font-size:10px;color:#64748b">${m.rate}%</span></td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="card">
    <h2>All Tasks</h2>
    <table>
      <tr><th>Key</th><th>Title</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Deadline</th><th>Sources</th></tr>
      ${tasks.map(t => {
        const dl = getDeadlineStatus(t.deadline, t.status);
        return `<tr>
          <td style="font-family:monospace;color:#2563eb;font-weight:700">${t.key || ''}</td>
          <td style="max-width:200px">${t.title || ''}</td>
          <td>${t.assignee || ''}</td>
          <td style="font-weight:700;color:${t.status === 'done' ? '#16a34a' : t.status === 'reconsideration' ? '#dc2626' : '#2563eb'}">${(t.status || '').replace('_', ' ').toUpperCase()}</td>
          <td style="font-weight:700;color:${t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#16a34a'}">${(t.priority || '').toUpperCase()}</td>
          <td style="color:${dl === 'OVERDUE' ? '#dc2626' : '#334155'}">${t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'} ${dl ? `(${dl})` : ''}</td>
          <td>${Object.values(t.sources || {}).filter(Boolean).length}/6</td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  <div class="footer">Generated by PulseBoard Enterprise &nbsp;·&nbsp; ${new Date().toLocaleString()}</div>
</body>
</html>`;
  };

  const handlePrintPDF = (htmlContent) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    }
  };

  const handleExport = () => {
    let content, mime, ext;

    if (mode === 'task') {
      if (!selectedTask) { alert('Please select a task first.'); return; }
      content = generateTaskHTML(selectedTask);
      if (format === 'pdf') {
        handlePrintPDF(content);
        return;
      }
      mime = 'text/html';
      ext = 'html';
    } else if (format === 'csv') {
      content = generateProjectCSV();
      mime = 'text/csv';
      ext = 'csv';
    } else if (format === 'pdf') {
      content = generateProjectHTML();
      handlePrintPDF(content);
      return;
    } else {
      content = generateProjectHTML();
      mime = 'text/html';
      ext = 'html';
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'task'
      ? `PulseBoard_Task_${selectedTask?.key || 'Report'}_${Date.now()}.${ext}`
      : `PulseBoard_Project_Report_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Export Report</h3>
              <p className="text-[10px] text-slate-500">Generate downloadable PDF/CSV/HTML report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Report mode selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('project')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  mode === 'project' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span className="text-xs font-bold">Project Report</span>
                <span className="text-[9px] opacity-70">Full team overview</span>
              </button>
              <button
                onClick={() => setMode('task')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  mode === 'task' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs font-bold">Task Report</span>
                <span className="text-[9px] opacity-70">Single task audit</span>
              </button>
            </div>
          </div>

          {/* Task selector */}
          {mode === 'task' && (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Select Task</label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">— Choose a task —</option>
                {tasks.map(t => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.key} — {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Format selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('pdf')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  format === 'pdf' ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold ring-1 ring-rose-400' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-200'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-rose-600" />
                PDF Report
              </button>
              <button
                onClick={() => setFormat('html')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  format === 'html' ? 'bg-purple-50 border-purple-300 text-purple-700 font-bold ring-1 ring-purple-400' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                HTML Report
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  format === 'csv' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                CSV Data
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
            {mode === 'task'
              ? '📋 Task report includes: description, source checklist, AI reasoning, deadline status, and security flags.'
              : '📊 Project report includes: team performance stats, all task statuses, deadline tracking, and source completions.'}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
