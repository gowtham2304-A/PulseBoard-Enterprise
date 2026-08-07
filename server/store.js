export const COLUMNS = [
  { id: 'todo', title: 'TO DO', max: null },
  { id: 'in_progress', title: 'IN PROGRESS', max: 3 },
  { id: 'review', title: 'IN REVIEW', max: null },
  { id: 'done', title: 'DONE', max: null },
  { id: 'reconsideration', title: 'RECONSIDERATION', max: null },
];

export const TEAM_MEMBERS = [
  { id: 'khidmat', name: 'Khidmat', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
  { id: 'vansh', name: 'Vansh', role: 'Developer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
];

class Store {
  constructor() {
    this.tasks = [];
    this.activityLog = [];
    this.processedSHAs = new Set();
  }

  getTasks() {
    return this.tasks;
  }

  getActivityLog() {
    return this.activityLog;
  }

  addTask(task) {
    this.tasks.unshift(task);
    return task;
  }

  clearTasks() {
    this.tasks = [];
    this.activityLog = [];
  }

  updateTaskStatus(taskId, updates) {
    let updatedTask = null;
    this.tasks = this.tasks.map(t => {
      if (t.id === taskId) {
        updatedTask = {
          ...t,
          ...updates,
          last_updated: new Date().toISOString()
        };
        return updatedTask;
      }
      return t;
    });
    return updatedTask;
  }

  addActivityLog(logEntry) {
    this.activityLog.unshift(logEntry);
    if (logEntry.sha) {
      this.processedSHAs.add(logEntry.sha);
    }
  }

  hasProcessedSHA(sha) {
    return this.processedSHAs.has(sha);
  }
}

export const store = new Store();
