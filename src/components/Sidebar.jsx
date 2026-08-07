import React from 'react';
import { LayoutGrid, Bot, Crown, Users, Plus, RefreshCw, Github, Download, BarChart2 } from 'lucide-react';

export function Sidebar({
  onToggleChat,
  isChatOpen,
  currentUser,
  onOpenMemberSelect,
  onOpenCreateTask,
  onClearBoard,
  viewMode,
  onViewModeChange,
  onDownloadCSV,
  onOpenTeamOverview
}) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between shrink-0 select-none z-30 shadow-sm">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">PulseBoard</h1>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-200">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Workspace</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 space-y-2">
          <button
            onClick={onOpenCreateTask}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Views
          </div>
          <button
            onClick={() => onViewModeChange('columns')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'columns'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => onViewModeChange('swimlanes')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'swimlanes'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Employee Swimlanes</span>
          </button>
        </div>

        {/* AI Drawer Launcher */}
        <div className="px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Assistant
          </div>
          <button
            onClick={onToggleChat}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              isChatOpen
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-blue-600" />
            <span>AI Copilot Drawer</span>
          </button>
        </div>

        {/* Reports + Manager Tools */}
        <div className="px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Reports
          </div>
          <button
            onClick={onDownloadCSV}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-700 border border-transparent hover:border-blue-100 transition-all"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Download CSV Report</span>
          </button>
          {currentUser?.isManager && (
            <button
              onClick={onOpenTeamOverview}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-100 transition-all"
            >
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <span>Team Overview</span>
            </button>
          )}
        </div>

        {/* Repo Watching Card */}
        <div className="mx-3 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
            <Github className="w-3.5 h-3.5 text-slate-700" />
            <span>Connected Repo</span>
          </div>
          <div className="font-mono text-[11px] text-blue-700 font-semibold bg-white p-1.5 rounded border border-slate-200 truncate">
            gowtham2304-A/exchnage
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>Polling Git Stream (5s)</span>
          </div>
        </div>
      </div>

      {/* User Account Switcher Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div
          onClick={onOpenMemberSelect}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <span className="truncate">{currentUser?.name || 'Gowtham'}</span>
                {currentUser?.isManager && <Crown className="w-3 h-3 text-amber-500" />}
              </div>
              <div className="text-[10px] text-slate-500">{currentUser?.role || 'Manager'}</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-blue-600 hover:underline shrink-0">Switch</span>
        </div>
      </div>
    </aside>
  );
}
