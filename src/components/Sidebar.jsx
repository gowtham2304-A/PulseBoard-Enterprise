import React from 'react';
import {
  LayoutGrid, Bot, Crown, Users, Plus, RefreshCw, Github,
  Download, BarChart2, FileText, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onToggleChat,
  isChatOpen,
  currentUser,
  onOpenMemberSelect,
  onOpenCreateTask,
  onClearBoard,
  viewMode,
  onViewModeChange,
  onDownloadCSV,
  onOpenTeamOverview,
  onOpenReportExport
}) {
  return (
    <aside
      className={`bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex flex-col">
        {/* Brand Header with Toggle Button */}
        <div className={`p-3.5 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-xs text-slate-900 tracking-tight">PulseBoard</h1>
                  <span className="px-1 py-0.2 text-[8px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-200">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Autonomous</p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-600" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Button */}
        <div className="p-2">
          <button
            onClick={onOpenCreateTask}
            title="Create New Task"
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.99] ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Create Task</span>}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="px-2 py-1 space-y-1">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Views
            </div>
          )}
          <button
            onClick={() => onViewModeChange('columns')}
            title="Kanban Board View"
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'columns'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LayoutGrid className="w-4 h-4 text-blue-600 shrink-0" />
            {!isCollapsed && <span>Kanban Board</span>}
          </button>

          <button
            onClick={() => onViewModeChange('swimlanes')}
            title="Employee Swimlanes View"
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'swimlanes'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            {!isCollapsed && <span>Swimlanes</span>}
          </button>
        </div>

        {/* AI Drawer Launcher */}
        <div className="px-2 py-1 space-y-1">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Assistant
            </div>
          )}
          <button
            onClick={onToggleChat}
            title="AI Copilot Drawer"
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition-all ${
              isChatOpen
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Bot className="w-4 h-4 text-blue-600 shrink-0" />
            {!isCollapsed && <span>AI Copilot</span>}
          </button>
        </div>

        {/* Reports + Manager Tools */}
        <div className="px-2 py-1 space-y-1">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Reports
            </div>
          )}
          {currentUser?.isManager && (
            <button
              onClick={onOpenTeamOverview}
              title="Team Overview"
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-100 transition-all ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <BarChart2 className="w-4 h-4 text-blue-600 shrink-0" />
              {!isCollapsed && <span>Team Overview</span>}
            </button>
          )}
          <button
            onClick={onOpenReportExport}
            title="Reports & Export"
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 shadow-sm transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Reports & Export</span>}
          </button>
        </div>

        {/* Repo Watching Card (only when expanded) */}
        {!isCollapsed && (
          <div className="mx-2 mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
              <Github className="w-3.5 h-3.5 text-slate-700" />
              <span>Connected Repo</span>
            </div>
            <div className="font-mono text-[10px] text-blue-700 font-semibold bg-white p-1 rounded border border-slate-200 truncate">
              gowtham2304-A/exchnage
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-500">
              <RefreshCw className="w-2.5 h-2.5 text-blue-600 animate-spin" />
              <span>Git Poller (5s)</span>
            </div>
          </div>
        )}
      </div>

      {/* User Account Switcher Footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
        <div
          onClick={onOpenMemberSelect}
          title={`Switch User (Current: ${currentUser?.name})`}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentUser?.name?.startsWith('V')
                  ? 'bg-blue-600 text-white'
                  : currentUser?.name?.startsWith('K')
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
            </span>
            {!isCollapsed && (
              <div className="truncate">
                <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                  <span className="truncate">{currentUser?.name || 'Gowtham'}</span>
                  {currentUser?.isManager && <Crown className="w-3 h-3 text-amber-500" />}
                </div>
                <div className="text-[9px] text-slate-500">{currentUser?.role || 'Manager'}</div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[9px] font-bold text-blue-600 hover:underline shrink-0">Switch</span>
          )}
        </div>
      </div>
    </aside>
  );
}
