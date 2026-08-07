import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { DiffViewerModal } from './components/DiffViewerModal';
import { AIChatAssistant } from './components/AIChatAssistant';
import { ReminderBanner } from './components/ReminderBanner';
import { MemberSelectModal, INITIAL_DEMO_MEMBERS } from './components/MemberSelectModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { AlertCircle } from 'lucide-react';

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
    // Add default last activity time
    const taskWithTime = {
      ...newTask,
      last_activity_time: new Date().toISOString()
    };
    setTasks((prev) => [taskWithTime, ...prev]);
    try {
      await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskWithTime)
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

  // Simulate 10-hour inactivity (Sets last activity to 12 hours ago)
  const handleSimulateInactivity = async (taskId) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, last_activity_time: twelveHoursAgo } : t))
    );

    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_activity_time: twelveHoursAgo })
      });
    } catch (e) {
      console.log('Backend offline, simulated locally.');
    }
  };

  // Export tasks and status logs as CSV
  const handleDownloadCSV = () => {
    if (tasks.length === 0) {
      alert('No tasks on board to export.');
      return;
    }

    const headers = ['Task Key', 'Title', 'Assignee', 'Status', 'Priority', 'Category Label', 'Last AI Summary', 'Last Active Time'];
    const rows = tasks.map(t => [
      t.key || 'N/A',
      `"${t.title.replace(/"/g, '""')}"`,
      t.assignee,
      t.status.toUpperCase(),
      t.priority.toUpperCase(),
      t.label || 'N/A',
      `"${(t.last_summary || '').replace(/"/g, '""')}"`,
      t.last_activity_time || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PulseBoard_Activity_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const updates = { 
      status: newStatus, 
      reconsideration_reason: '',
      last_activity_time: new Date().toISOString() // reset inactivity
    };

    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {}

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, last_updated: 'Just now' } : t))
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

  // Identify stale tasks (inactive for >10 hours, excluding done)
  const staleTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'done' || !t.last_activity_time) return false;
      const diffHours = (new Date() - new Date(t.last_activity_time)) / (1000 * 60 * 60);
      return diffHours >= 10;
    });
  }, [tasks]);

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
        onDownloadCSV={handleDownloadCSV}
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

        {/* Manager Inactivity Notifications Banner */}
        {currentUser?.isManager && staleTasks.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3 text-xs text-amber-900 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900">Manager Alert Center:</span>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                {staleTasks.map(t => (
                  <li key={t.id}>
                    Developer <strong className="text-slate-900">{t.assignee}</strong> has been inactive on task <strong className="text-blue-700">{t.key} ("{t.title}")</strong> for over 10 hours. Please check in with them!
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

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
            onSimulateInactivity={handleSimulateInactivity}
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
