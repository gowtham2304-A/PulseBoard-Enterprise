import mongoose from 'mongoose';

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

// Connect to Local MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulseboard';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('🔌 Connected to Local MongoDB (pulseboard)'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// Task Schema
const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  key: String,
  title: { type: String, required: true },
  description: String,
  status: { type: String, default: 'todo' },
  assignee: String,
  assigneeAvatar: String,
  priority: { type: String, default: 'medium' },
  label: String,
  last_summary: String,
  reconsideration_reason: String,
  last_updated: { type: String, default: () => new Date().toISOString() },
  last_activity_time: { type: String, default: () => new Date().toISOString() },
  deadline: { type: String, default: null },
  sources: { type: Object, default: {} },
  confidence: String
});

// Activity Log Schema (Provider-Agnostic with backward compatible sha field)
const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  provider: { type: String, default: 'github' },
  repositoryId: String,
  repositoryName: String,
  changeId: String,
  sha: String, // Backward compatibility alias for changeId
  author: String,
  message: String,
  matchedTask: String,
  matchedTaskId: String,
  statusShift: String,
  summary: String,
  confidence: String,
  timestamp: { type: String, default: () => new Date().toISOString() }
});

// Active Session Schema
const SessionSchema = new mongoose.Schema({
  key: { type: String, default: 'active_session', unique: true },
  currentUser: {
    id: String,
    name: String,
    role: String,
    isManager: Boolean,
    avatar: String
  }
});

// Active Connection Metadata Schema (Non-secret metadata)
const ConnectionSchema = new mongoose.Schema({
  key: { type: String, default: 'active_connection', unique: true },
  provider: { type: String, default: 'github' },
  repositoryId: String,
  repositoryName: String,
  repositoryUrl: String,
  status: { type: String, default: 'connected' },
  lastVerified: { type: String, default: () => new Date().toISOString() }
});

const Task = mongoose.model('Task', TaskSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Session = mongoose.model('Session', SessionSchema);
const Connection = mongoose.model('Connection', ConnectionSchema);

class Store {
  async getSession() {
    try {
      const session = await Session.findOne({ key: 'active_session' });
      return session ? session.currentUser : null;
    } catch (e) {
      console.error('Error reading session from MongoDB:', e.message);
      return null;
    }
  }

  async saveSession(user) {
    try {
      await Session.findOneAndUpdate(
        { key: 'active_session' },
        { currentUser: user },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('Error saving session to MongoDB:', e.message);
    }
  }

  async getConnection() {
    try {
      const conn = await Connection.findOne({ key: 'active_connection' });
      return conn ? {
        provider: conn.provider,
        repositoryId: conn.repositoryId,
        repositoryName: conn.repositoryName,
        repositoryUrl: conn.repositoryUrl,
        status: conn.status,
        lastVerified: conn.lastVerified
      } : null;
    } catch (e) {
      console.error('Error reading connection metadata from MongoDB:', e.message);
      return null;
    }
  }

  async saveConnection(connData) {
    try {
      const updated = await Connection.findOneAndUpdate(
        { key: 'active_connection' },
        {
          provider: connData.provider,
          repositoryId: connData.repositoryId,
          repositoryName: connData.repositoryName,
          repositoryUrl: connData.repositoryUrl,
          status: connData.status || 'connected',
          lastVerified: new Date().toISOString()
        },
        { upsert: true, new: true }
      );
      return updated;
    } catch (e) {
      console.error('Error saving connection metadata to MongoDB:', e.message);
      return null;
    }
  }

  async getTasks() {
    try {
      return await Task.find({}).sort({ last_updated: -1 });
    } catch (e) {
      console.error('Error fetching tasks from MongoDB:', e.message);
      return [];
    }
  }

  async getActivityLog() {
    try {
      return await Activity.find({}).sort({ timestamp: -1 });
    } catch (e) {
      console.error('Error fetching activity log from MongoDB:', e.message);
      return [];
    }
  }

  async addTask(taskData) {
    try {
      const task = await Task.findOneAndUpdate(
        { id: taskData.id },
        {
          ...taskData,
          last_activity_time: taskData.last_activity_time || new Date().toISOString()
        },
        { upsert: true, new: true }
      );
      return task;
    } catch (e) {
      console.error('Error adding task to MongoDB:', e.message);
      return taskData;
    }
  }

  async clearTasks() {
    try {
      await Task.deleteMany({});
      await Activity.deleteMany({});
      console.log('🗑️ MongoDB database cleared successfully.');
    } catch (e) {
      console.error('Error clearing database:', e.message);
    }
  }

  async updateTaskStatus(taskId, updates) {
    try {
      const task = await Task.findOneAndUpdate(
        { id: taskId },
        { 
          ...updates,
          last_updated: new Date().toISOString()
        },
        { new: true }
      );
      return task;
    } catch (e) {
      console.error('Error updating task in MongoDB:', e.message);
      return null;
    }
  }

  async addActivityLog(logEntry) {
    try {
      const entry = {
        ...logEntry,
        changeId: logEntry.changeId || logEntry.sha,
        sha: logEntry.sha || logEntry.changeId
      };
      const log = new Activity(entry);
      await log.save();
    } catch (e) {
      console.error('Error adding activity log to MongoDB:', e.message);
    }
  }

  async hasProcessedChange(changeId, provider = null, repositoryId = null) {
    if (!changeId) return false;
    try {
      const shortId = changeId.substring(0, 7);

      // Scoped lookup: provider + repositoryId + changeId (preferred for multi-provider)
      if (provider && repositoryId) {
        const scopedMatch = await Activity.findOne({
          provider: provider,
          repositoryId: repositoryId,
          $or: [
            { changeId: changeId },
            { changeId: shortId },
            { sha: changeId },
            { sha: shortId }
          ]
        });
        return !!scopedMatch;
      }

      // Legacy fallback: changeId/sha only (backward compat for old records)
      const match = await Activity.findOne({
        $or: [
          { changeId: changeId },
          { changeId: shortId },
          { sha: changeId },
          { sha: shortId }
        ]
      });
      return !!match;
    } catch (e) {
      return false;
    }
  }

  async hasProcessedSHA(sha) {
    return this.hasProcessedChange(sha);
  }
}

export const store = new Store();
