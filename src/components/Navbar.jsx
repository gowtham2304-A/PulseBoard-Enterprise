import React from 'react';
import { Search, ChevronDown, ArrowUpDown, Trash2, ShieldCheck } from 'lucide-react';
import { TEAM_MEMBERS } from '../data/initialData';

export function Navbar({
  searchQuery,
  onSearchChange,
  selectedAssignee,
  onSelectAssignee,
  selectedPriority,
  onPriorityChange,
  sortBy,
  onSortByChange,
  onClearBoard
}) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 app-header">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Project Board</h2>
            <span className="flex items-center gap-2 text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Live Sync
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Real-time autonomous Git status tracking</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tickets..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
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
            All Members
          </button>
          {TEAM_MEMBERS.map((member) => {
            const isSelected = selectedAssignee === member.name;
            return (
              <button
                key={member.id}
                onClick={() => onSelectAssignee(isSelected ? 'all' : member.name)}
                title={`Filter by ${member.name}`}
                className={`relative p-0.5 rounded-full transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              </button>
            );
          })}
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs appearance-none pr-7 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="default">Sort: Default</option>
            <option value="priority">Priority: High ➔ Low</option>
            <option value="key">Ticket Key</option>
          </select>
          <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Clear All */}
        <button
          onClick={onClearBoard}
          title="Clear Board"
          className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
