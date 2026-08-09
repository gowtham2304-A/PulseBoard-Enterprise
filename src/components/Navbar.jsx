import React from 'react';
import { Search, ChevronDown, ArrowUpDown, Trash2, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { TEAM_MEMBERS } from '../data/initialData';

export function Navbar({
  searchQuery,
  onSearchChange,
  selectedAssignee,
  onSelectAssignee,
  selectedPriority,
  onPriorityChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  missingDataFilter,
  onMissingDataFilterChange,
  sortBy,
  onSortByChange,
  onClearBoard,
  onResetFilters,
}) {
  const hasActiveFilters =
    searchQuery ||
    selectedAssignee !== 'all' ||
    selectedPriority !== 'all' ||
    selectedStatus !== 'all' ||
    selectedCategory !== 'all' ||
    missingDataFilter !== 'none' ||
    sortBy !== 'default';

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 app-header">
      {/* Top Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Project Board</h2>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3" />
            Live Sync
          </span>
        </div>

        {/* Reset + Clear */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-all"
            >
              <X className="w-3 h-3" />
              Reset Filters
            </button>
          )}
          <button
            onClick={onClearBoard}
            title="Clear Board"
            className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tickets..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Member Filter */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => onSelectAssignee('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              selectedAssignee === 'all'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {TEAM_MEMBERS.map((member) => {
            const isSelected = selectedAssignee === member.name;
            const firstName = member.name.split(' ')[0];
            const initialColor = {
              Gowtham: 'bg-indigo-600 text-white',
              Vansh: 'bg-blue-600 text-white',
              Khidmat: 'bg-emerald-600 text-white',
            }[firstName] || 'bg-slate-700 text-white';

            return (
              <button
                key={member.id}
                onClick={() => onSelectAssignee(isSelected ? 'all' : member.name)}
                title={`Filter: ${member.name}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-white text-blue-600 shadow-sm border border-blue-200 ring-1 ring-blue-500'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${initialColor}`}>
                  {firstName.charAt(0).toUpperCase()}
                </span>
                <span>{firstName}</span>
              </button>
            );
          })}
        </div>

        {/* Status Filter — Advanced Bounty */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`bg-slate-50 border rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium ${
              selectedStatus !== 'all' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Done</option>
            <option value="reconsideration">Reconsideration</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category Filter — Advanced Bounty */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`bg-slate-50 border rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium ${
              selectedCategory !== 'all' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Categories</option>
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="Security">Security</option>
            <option value="Database">Database</option>
            <option value="Feature">Feature</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={`bg-slate-50 border rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium ${
              selectedPriority !== 'all' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Missing Data Flag Filter — Advanced Bounty */}
        <div className="relative">
          <select
            value={missingDataFilter}
            onChange={(e) => onMissingDataFilterChange(e.target.value)}
            className={`bg-slate-50 border rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium ${
              missingDataFilter !== 'none' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-700'
            }`}
          >
            <option value="none">🚩 Flag Filter: Off</option>
            <option value="missing_sources">Missing Sources</option>
            <option value="overdue">Overdue Deadline</option>
            <option value="inactive">10h+ Inactive</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="default">Sort: Default</option>
            <option value="priority">Priority: High → Low</option>
            <option value="deadline">Deadline: Soonest</option>
            <option value="assignee">Assignee A-Z</option>
            <option value="key">Ticket Key</option>
          </select>
          <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Active filter count badge */}
        {hasActiveFilters && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            Filters Active
          </span>
        )}
      </div>
    </header>
  );
}
