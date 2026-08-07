import React from 'react';
import { TaskCard } from './TaskCard';
import { COLUMNS, TEAM_MEMBERS } from '../data/initialData';

export function KanbanBoard({ tasks, onTaskClick, onManualMove, viewMode, onSimulateInactivity }) {
  if (viewMode === 'swimlanes') {
    return (
      <div className="p-6 max-w-[1700px] mx-auto space-y-5">
        {TEAM_MEMBERS.map((member) => {
          const memberTasks = tasks.filter((t) => t.assignee === member.name);

          return (
            <div key={member.id} className="enterprise-panel rounded-xl p-5">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{member.name}</span>
                      <span className="text-xs font-normal text-slate-500">({member.role})</span>
                    </h3>
                    <div className="text-xs text-slate-500">
                      {memberTasks.length} assigned task(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                    In Progress: {memberTasks.filter(t => t.status === 'in_progress').length}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                    Reconsideration: {memberTasks.filter(t => t.status === 'reconsideration').length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {memberTasks.length > 0 ? (
                  memberTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onTaskClick={onTaskClick}
                      onManualMove={onManualMove}
                      columns={COLUMNS}
                      onSimulateInactivity={onSimulateInactivity}
                    />
                  ))
                ) : (
                  <div className="col-span-full p-4 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400 font-mono bg-slate-50/50">
                    No active tickets assigned to {member.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-6 max-w-[1700px] mx-auto">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        const isMaxExceeded = column.max && columnTasks.length > column.max;

        const colDotColor = {
          todo: 'bg-slate-400',
          in_progress: 'bg-blue-600',
          review: 'bg-indigo-600',
          done: 'bg-emerald-600',
          reconsideration: 'bg-rose-600',
        };

        return (
          <div
            key={column.id}
            className="flex flex-col rounded-xl bg-slate-100/70 p-3.5 min-h-[680px] border border-slate-200/80"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${colDotColor[column.id] || 'bg-slate-400'}`}></span>
                <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  {column.title}
                </h2>
                <span className="text-xs text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {columnTasks.length}
                </span>
              </div>

              {column.max && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    isMaxExceeded
                      ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  MAX {column.max}
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onTaskClick={onTaskClick}
                    onManualMove={onManualMove}
                    columns={COLUMNS}
                    onSimulateInactivity={onSimulateInactivity}
                  />
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400 font-mono bg-white/40">
                  No tickets
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
