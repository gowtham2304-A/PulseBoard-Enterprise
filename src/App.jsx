import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { DiffViewerModal } from './components/DiffViewerModal';
import { AIChatAssistant } from './components/AIChatAssistant';
import { ReminderBanner } from './components/ReminderBanner';
import { MemberSelectModal, INITIAL_DEMO_MEMBERS } from './components/MemberSelectModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskReminderFlashCard } from './components/TaskReminderFlashCard';
import { ManagerOverviewPanel } from './components/ManagerOverviewPanel';
import { ReportExportModal } from './components/ReportExportModal';
import { SourceControlModal } from './components/SourceControlModal';
import { DeadlineAlertModal } from './components/DeadlineAlertModal';
import { AlertCircle, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://pulseboard-enterprise.onrender.com/api';

function getDeadlineUrgency(deadline, status) {
  if (!deadline || status === 'done') return null;
  const diffMs = new Date(deadline) - new Date();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 0) return { isOverdue: true, isUrgent: true, label: 'OVERDUE', hoursLeft: diffHours };
  if (diffHours < 1) return { isOverdue: false, isUrgent: true, label: `${Math.ceil(diffHours * 60)}m left`, hoursLeft: diffHours };
  return null;
}

export default function App() {
  // ─── All data loaded from DB — no localStorage ─────────────────────────────
  const [tasks, setTasks] = useState([]);
  const [commitLog, setCommitLog] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // null until DB responds
  const [demoMembers] = useState(INITIAL_DEMO_MEMBERS);

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');       // Advanced Bounty
  const [selectedCategory, setSelectedCategory] = useState('all');   // Advanced Bounty
  const [missingDataFilter, setMissingDataFilter] = useState('none'); // Advanced Bounty
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('columns');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedTaskForDiff, setSelectedTaskForDiff] = useState(null);
  const [isFlashCardOpen, setIsFlashCardOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isManagerOverviewOpen, setIsManagerOverviewOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); // Elite Bounty
  const [isSourceControlOpen, setIsSourceControlOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(true);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAssignee('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setMissingDataFilter('none');
    setSortBy('default');
  };

  // ─── Load Tasks + Active Session from MongoDB on mount ──────────────────────
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (res.ok) {
          const data = await res.json();
          if (data.tasks) setTasks(data.tasks);
        }
      } catch (err) {
        console.log('[PulseBoard] Backend offline — tasks not loaded.');
      }
    }

    async function loadSession() {
      try {
        const res = await fetch(`${API_BASE}/session`);
        if (res.ok) {
          const data = await res.json();
          if (data.currentUser) {
            setCurrentUser(data.currentUser);
          } else {
            // First time — default to Manager (Gowtham)
            setCurrentUser(INITIAL_DEMO_MEMBERS[0]);
          }
        }
      } catch (e) {
        console.log('[PulseBoard] Could not load session from DB — defaulting to Manager.');
        setCurrentUser(INITIAL_DEMO_MEMBERS[0]);
      }
    }

    async function loadActivity() {
      try {
        const res = await fetch(`${API_BASE}/activity`);
        if (res.ok) {
          const data = await res.json();
          if (data.activity) setCommitLog(data.activity);
        }
      } catch (err) {}
    }

    async function loadConnection() {
      try {
        const res = await fetch(`${API_BASE}/integrations/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.connection) setActiveConnection(data.connection);
        }
      } catch (err) {}
    }

    loadTasks();
    loadSession();
    loadActivity();
    loadConnection();

    // Poll tasks and live git activity from DB every 5 seconds
    const interval = setInterval(() => {
      loadTasks();
      loadActivity();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── Switch User — saves to MongoDB, no localStorage ────────────────────────
  const handleSelectUser = async (user) => {
    setCurrentUser(user);
    try {
      await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser: user })
      });
    } catch (e) {
      console.log('[PulseBoard] Could not save session to DB.');
    }
    setIsDeadlineModalOpen(true);
    if (user && !user.isManager) {
      setIsFlashCardOpen(true);
    }
  };

  // ─── Create Task — saves to MongoDB ─────────────────────────────────────────
  const handleAddTask = async (newTask) => {
    const taskWithTime = { ...newTask, last_activity_time: new Date().toISOString() };
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskWithTime)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) setTasks(data.tasks);
      }
    } catch (e) {
      console.log('[PulseBoard] Could not save task to DB.');
    }
  };

  // ─── Clear Board — deletes from MongoDB ─────────────────────────────────────
  const handleClearBoard = async () => {
    if (window.confirm('Clear all tasks from the database?')) {
      try {
        await fetch(`${API_BASE}/tasks`, { method: 'DELETE' });
        setTasks([]);
      } catch (e) {
        console.log('[PulseBoard] Could not clear DB.');
      }
    }
  };

  // ─── Move Task Status — persisted to MongoDB ─────────────────────────────────
  const handleManualMove = async (taskId, newStatus) => {
    const updates = {
      status: newStatus,
      reconsideration_reason: '',
      last_activity_time: new Date().toISOString()
    };
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) { }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, last_updated: 'Just now' } : t))
    );
  };

  const handleResolveReconsideration = (taskId) => handleManualMove(taskId, 'in_progress');

  // ─── Simulate 10h Idle — persisted to MongoDB ────────────────────────────────
  const handleSimulateInactivity = async (taskId) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_activity_time: twelveHoursAgo })
      });
    } catch (e) { }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, last_activity_time: twelveHoursAgo } : t))
    );
  };

  // ─── Set / Update Deadline — persisted to MongoDB for any user ───────────────
  const handleSetDeadline = async (taskId, deadlineIso) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadlineIso })
      });
    } catch (e) { }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, deadline: deadlineIso } : t))
    );
  };

  // ─── Core Bounty: Update Task Sources ─────────────────────────────
  const handleUpdateSources = async (taskId, sources) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources })
      });
    } catch (e) {}
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, sources } : t))
    );
  };

  // ─── CSV Export — reads from DB tasks state ───────────────────────────────────
  const handleDownloadCSV = () => {
    if (tasks.length === 0) { alert('No tasks on board to export.'); return; }
    const headers = ['Task Key', 'Title', 'Assignee', 'Status', 'Priority', 'Category', 'Deadline', 'AI Summary', 'Last Active'];
    const rows = tasks.map(t => [
      t.key || 'N/A',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.assignee,
      t.status.toUpperCase(),
      t.priority.toUpperCase(),
      t.label || 'N/A',
      t.deadline ? new Date(t.deadline).toLocaleString() : 'No deadline',
      `"${(t.last_summary || '').replace(/"/g, '""')}"`,
      t.last_activity_time || 'N/A'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PulseBoard_Report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Derived State ────────────────────────────────────────────────────────────
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.key?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) ||
        (t.label && t.label.toLowerCase().includes(q))
      );
    }
    // Filters
    if (selectedAssignee !== 'all') result = result.filter(t => t.assignee === selectedAssignee);
    if (selectedPriority !== 'all') result = result.filter(t => t.priority === selectedPriority);
    if (selectedStatus !== 'all') result = result.filter(t => t.status === selectedStatus);      // Advanced Bounty
    if (selectedCategory !== 'all') result = result.filter(t => t.label === selectedCategory);  // Advanced Bounty
    
    // Missing Data Flag filter — Advanced Bounty
    if (missingDataFilter === 'missing_sources') {
      result = result.filter(t => Object.values(t.sources || {}).filter(Boolean).length < 6);
    } else if (missingDataFilter === 'overdue') {
      result = result.filter(t => {
        if (!t.deadline || t.status === 'done') return false;
        return new Date(t.deadline) < new Date();
      });
    } else if (missingDataFilter === 'inactive') {
      result = result.filter(t => {
        if (t.status === 'done' || !t.last_activity_time) return false;
        return (new Date() - new Date(t.last_activity_time)) / 3600000 >= 10;
      });
    }

    // Sorting
    if (sortBy === 'priority') {
      const pOrder = { high: 1, medium: 2, low: 3 };
      result.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
    } else if (sortBy === 'assignee') {
      result.sort((a, b) => a.assignee?.localeCompare(b.assignee));
    } else if (sortBy === 'key') {
      result.sort((a, b) => a.key?.localeCompare(b.key));
    } else if (sortBy === 'deadline') {
      result.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    }
    return result;
  }, [tasks, searchQuery, selectedAssignee, selectedPriority, sortBy]);

  const reconsiderationTasks = tasks.filter(t => t.status === 'reconsideration');

  // Stale tasks (inactive 10h+) for manager
  const staleTasks = useMemo(() =>
    tasks.filter(t => {
      if (t.status === 'done' || !t.last_activity_time) return false;
      const lastActive = new Date(t.last_activity_time);
      if (isNaN(lastActive.getTime())) return false;
      return (new Date() - lastActive) / 3600000 >= 10;
    }), [tasks]);

  // Deadline-urgent tasks for manager (overdue or <1h remaining)
  const deadlineAlerts = useMemo(() =>
    tasks.filter(t => {
      const dl = getDeadlineUrgency(t.deadline, t.status);
      return dl !== null;
    }), [tasks]);

  // Loading state — wait for DB session to load
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading PulseBoard from database…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 selection:bg-blue-600 selection:text-white">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        currentUser={currentUser}
        onOpenMemberSelect={() => setIsMemberModalOpen(true)}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onClearBoard={handleClearBoard}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onDownloadCSV={handleDownloadCSV}
        onOpenTeamOverview={() => setIsManagerOverviewOpen(true)}
        onOpenReportExport={() => setIsReportModalOpen(true)}
        onOpenSourceControlModal={() => setIsSourceControlOpen(true)}
        activeConnection={activeConnection}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedAssignee={selectedAssignee}
          onSelectAssignee={setSelectedAssignee}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          missingDataFilter={missingDataFilter}
          onMissingDataFilterChange={setMissingDataFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onClearBoard={handleClearBoard}
          onResetFilters={handleResetFilters}
        />



        {/* ── Manager: 10h Inactivity Banner ── */}
        {currentUser?.isManager && staleTasks.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900">Manager Alert — Inactive Developers:</span>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                {staleTasks.map(t => (
                  <li key={t.id}>
                    <strong>{t.assignee}</strong> has been inactive on <strong className="text-blue-700">{t.key} "{t.title}"</strong> for 10+ hours.
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
            onSetDeadline={handleSetDeadline}
          />
        </main>
      </div>

      <AIChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        tasks={tasks}
        commitLog={commitLog}
        currentUser={currentUser}
      />

      <DiffViewerModal
        task={selectedTaskForDiff}
        commitLog={commitLog}
        onClose={() => setSelectedTaskForDiff(null)}
        onUpdateSources={handleUpdateSources}
      />

      <MemberSelectModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        members={demoMembers}
        onAddMember={() => { }}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onAddTask={handleAddTask}
        members={demoMembers}
      />

      <TaskReminderFlashCard
        isOpen={isFlashCardOpen}
        onClose={() => setIsFlashCardOpen(false)}
        tasks={tasks}
        currentUser={currentUser}
      />

      <ManagerOverviewPanel
        isOpen={isManagerOverviewOpen}
        onClose={() => setIsManagerOverviewOpen(false)}
        tasks={tasks}
        teamMembers={demoMembers}
      />

      {/* Elite Bounty: Report Export Modal */}
      <ReportExportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
        teamMembers={demoMembers}
      />

      {/* Source Control Provider Connection Modal */}
      <SourceControlModal
        isOpen={isSourceControlOpen}
        onClose={() => setIsSourceControlOpen(false)}
        onConnectionUpdated={() => {
          // Refresh active connection status
          fetch(`${API_BASE}/integrations/status`)
            .then(res => res.json())
            .then(data => { if (data.connection) setActiveConnection(data.connection); })
            .catch(() => {});
        }}
      />

      {/* Interactive Deadline Alert Popup Modal */}
      <DeadlineAlertModal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        tasks={tasks}
        currentUser={currentUser}
        onSelectTask={(task) => setSelectedTaskForDiff(task)}
      />
    </div>
  );
}
