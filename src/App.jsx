import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { DiffViewerModal } from './components/DiffViewerModal';
import { AIChatAssistant } from './components/AIChatAssistant';
import { ReminderBanner } from './components/ReminderBanner';
import { MemberSelectModal, INITIAL_DEMO_MEMBERS } from './components/MemberSelectModal';
import { CreateTaskModal } from './components/CreateTaskModal';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [commitLog, setCommitLog] = useState([]);

  const [demoMembers, setDemoMembers] = useState(INITIAL_DEMO_MEMBERS);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('pulseboard_user_identity');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_MEMBERS[0];
  });
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('columns');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedTaskForDiff, setSelectedTaskForDiff] = useState(null);

  const handleSelectUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('pulseboard_user_identity', JSON.stringify(user));
  };

  const handleAddMember = (newMember) => {
    setDemoMembers((prev) => [...prev, newMember]);
  };

  const handleAddTask = async (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
    try {
      await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } catch (e) {
      console.log('Backend offline, saved locally.');
    }
  };

  const handleClearBoard = async () => {
    if (window.confirm('Clear all tasks on the board?')) {
      setTasks([]);
      try {
        await fetch(`${API_BASE}/tasks`, { method: 'DELETE' });
      } catch (e) {
        console.log('Backend offline, cleared locally.');
      }
    }
  };

  useEffect(() => {
    async function loadBackendData() {
      try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (res.ok) {
          const data = await res.json();
          if (data.tasks) setTasks(data.tasks);
        }
      } catch (err) {
        console.log('Backend offline polling fallback.');
      }
    }
    loadBackendData();
    const interval = setInterval(loadBackendData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualMove = async (taskId, newStatus) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reconsideration_reason: '' })
      });
    } catch (e) {}

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, reconsideration_reason: '', last_updated: 'Just now' } : t))
    );
  };

  const handleResolveReconsideration = (taskId) => {
    handleManualMove(taskId, 'in_progress');
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          (t.label && t.label.toLowerCase().includes(q))
      );
    }

    if (selectedAssignee !== 'all') {
      result = result.filter((t) => t.assignee === selectedAssignee);
    }

    if (selectedPriority !== 'all') {
      result = result.filter((t) => t.priority === selectedPriority);
    }

    if (sortBy === 'priority') {
      const pOrder = { high: 1, medium: 2, low: 3 };
      result.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
    } else if (sortBy === 'assignee') {
      result.sort((a, b) => a.assignee.localeCompare(b.assignee));
    } else if (sortBy === 'key') {
      result.sort((a, b) => a.key.localeCompare(b.key));
    }

    return result;
  }, [tasks, searchQuery, selectedAssignee, selectedPriority, sortBy]);

  const reconsiderationTasks = tasks.filter((t) => t.status === 'reconsideration');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Unified Single Left Sidebar */}
      <Sidebar
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        currentUser={currentUser}
        onOpenMemberSelect={() => setIsMemberModalOpen(true)}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onClearBoard={handleClearBoard}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedAssignee={selectedAssignee}
          onSelectAssignee={setSelectedAssignee}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onClearBoard={handleClearBoard}
        />

        <ReminderBanner
          reconsiderationTasks={reconsiderationTasks}
          onResolveReconsideration={handleResolveReconsideration}
        />

        <main className="flex-1 overflow-x-auto">
          <KanbanBoard
            tasks={filteredAndSortedTasks}
            onTaskClick={(task) => setSelectedTaskForDiff(task)}
            onManualMove={handleManualMove}
            viewMode={viewMode}
          />
        </main>
      </div>

      {/* AI Copilot Drawer */}
      <AIChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        tasks={tasks}
        commitLog={commitLog}
        currentUser={currentUser}
      />

      {/* Modals */}
      <DiffViewerModal
        task={selectedTaskForDiff}
        commitLog={commitLog}
        onClose={() => setSelectedTaskForDiff(null)}
      />

      <MemberSelectModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        members={demoMembers}
        onAddMember={handleAddMember}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onAddTask={handleAddTask}
        members={demoMembers}
      />
    </div>
  );
}
