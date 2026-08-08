import React from 'react';
import { TaskCard } from './TaskCard';
import { COLUMNS, TEAM_MEMBERS } from '../data/initialData';

export function KanbanBoard({
  tasks = [],
  columns = COLUMNS,
  viewMode = 'columns',
  onTaskClick,
  onManualMove,
  onSimulateInactivity,
  onSetDeadline,
}) {
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
                    <div className="text-xs text-slate-500">{memberTasks.length} assigned task(s)</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                    In Progress: {memberTasks.filter((t) => t.status === 'in_progress').length}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                    Reconsideration: {memberTasks.filter((t) => t.status === 'reconsideration').length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {memberTasks.length > 0 ? (
                  memberTasks.map((task) => (
                    <TaskCard
                      key={task.id || task._id}
                      task={task}
                      onTaskClick={onTaskClick}
                      onManualMove={onManualMove}
                      columns={columns}
                      onSimulateInactivity={onSimulateInactivity}
                      onSetDeadline={onSetDeadline}
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
    <div className="flex gap-2.5 p-4 w-full overflow-x-auto justify-between kanban-scroll">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex-1 min-w-[200px] max-w-[270px] kanban-column rounded-2xl p-2.5 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold uppercase text-slate-600 tracking-wider">{col.title}</h4>
            <span className="text-[12px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">{tasks.filter((t) => t.status === col.id).length}</span>
          </div>

          <div className="space-y-4">
            {tasks
              .filter((t) => t.status === col.id)
              .map((task) => (
                <TaskCard
                  key={task.id || task._id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onManualMove={onManualMove}
                  columns={columns}
                  onSimulateInactivity={onSimulateInactivity}
                  onSetDeadline={onSetDeadline}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KanbanBoard;
