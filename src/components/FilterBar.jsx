import React from 'react';
import { Search, ChevronDown, ArrowUpDown, LayoutGrid, Users } from 'lucide-react';
import { TEAM_MEMBERS } from '../data/initialData';

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedAssignee,
  onSelectAssignee,
  selectedPriority,
  onPriorityChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange
}) {
  return (
    <div className="px-6 pt-5 pb-3 border-b border-slate-800/80 bg-[#0B0F17]/90 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-100 font-heading tracking-tight">
          Board
        </h1>

        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => onViewModeChange('columns')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'columns'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Columns</span>
          </button>

          <button
            onClick={() => onViewModeChange('swimlanes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'swimlanes'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Swimlanes</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tickets, keys, diffs..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectAssignee('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedAssignee === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>

          {TEAM_MEMBERS.map((member) => {
            const isSelected = selectedAssignee === member.name;
            return (
              <button
                key={member.id}
                onClick={() => onSelectAssignee(isSelected ? 'all' : member.name)}
                title={`Filter tasks by ${member.name}`}
                className={`relative group p-0.5 rounded-full transition-all ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0B0F17] scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    member.name?.startsWith('V')
                      ? 'bg-blue-600 text-white'
                      : member.name?.startsWith('K')
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-slate-200 text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50 border border-slate-700">
                  {member.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedPriority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs appearance-none pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Label: All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs appearance-none pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="default">Sort by: Default</option>
              <option value="priority">Priority: High ➔ Low</option>
              <option value="updated">Recently Updated</option>
              <option value="assignee">Employee Name</option>
              <option value="key">Ticket Key (PLS-101)</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {(selectedAssignee !== 'all' || selectedPriority !== 'all' || searchQuery.trim() !== '') && (
          <button
            onClick={() => {
              onSelectAssignee('all');
              onPriorityChange('all');
              onSearchChange('');
            }}
            className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
