import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(process.env.DOTENV_CONFIG_PATH ? { path: process.env.DOTENV_CONFIG_PATH } : undefined);

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

const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? (process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/pulseboard_test')
  : (process.env.MONGODB_URI || process.env.MONGO_URI);
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

if (!MONGODB_URI && IS_PRODUCTION) {
  console.error('❌ CRITICAL ERROR: MONGODB_URI environment variable is missing in production deployment.');
  throw new Error('MONGODB_URI environment variable is required in production environment.');
}

const EFFECTIVE_MONGODB_URI = MONGODB_URI || 'mongodb://127.0.0.1:27017/pulseboard';
const isLocalDb = EFFECTIVE_MONGODB_URI.includes('127.0.0.1') || EFFECTIVE_MONGODB_URI.includes('localhost');

mongoose.connect(EFFECTIVE_MONGODB_URI)
  .then(() => {
    if (isLocalDb) {
      console.log('🔌 Connected to Local MongoDB (pulseboard)');
    } else {
      console.log('🔌 Connected to Remote MongoDB Atlas Database');
    }
  })
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

// Connection Metadata Schema (Supports safe metadata + optional encrypted credential object)
const ConnectionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  key: String, // Backward compatibility alias
  provider: { type: String, required: true },
  repositoryId: { type: String, required: true },
  repositoryName: String,
  repositoryUrl: String,
  status: { type: String, default: 'connected' },
  lastVerified: { type: String, default: () => new Date().toISOString() },
  credential: {
    encrypted: String,
    iv: String,
    authTag: String
  },
  userId: String,
  organizationId: String,
  workspaceId: String
});

const Task = mongoose.model('Task', TaskSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Session = mongoose.model('Session', SessionSchema);
const Connection = mongoose.model('Connection', ConnectionSchema);
Connection.collection.dropIndex('key_1').catch(() => {});

function buildConnectionQuery(idOrRepoId) {
  if (!idOrRepoId) return null;
  const repoOnly = idOrRepoId.includes(':') ? idOrRepoId.split(':')[1] : idOrRepoId;
  return {
    $or: [
      { id: idOrRepoId },
      { repositoryId: idOrRepoId },
      { repositoryId: repoOnly },
      { key: idOrRepoId }
    ]
  };
}

function formatSafeConnection(conn) {
  if (!conn) return null;
  return {
    id: conn.id || `${conn.provider}:${conn.repositoryId}`,
    provider: conn.provider,
    repositoryId: conn.repositoryId,
    repositoryName: conn.repositoryName || conn.repositoryId,
    repositoryUrl: conn.repositoryUrl || '',
    status: conn.status || 'connected',
    lastVerified: conn.lastVerified || new Date().toISOString(),
    hasCredential: Boolean(conn.credential && conn.credential.encrypted)
  };
}

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

  async getConnections() {
    try {
      const conns = await Connection.find({});
      return conns.map(formatSafeConnection);
    } catch (e) {
      console.error('Error reading connections from MongoDB:', e.message);
      return [];
    }
  }

  async getConnection(idOrRepoId = null) {
    try {
      let conn = null;
      if (idOrRepoId) {
        conn = await Connection.findOne(buildConnectionQuery(idOrRepoId));
      } else {
        conn = await Connection.findOne({ key: 'active_connection' });
        if (!conn) {
          conn = await Connection.findOne({}).sort({ lastVerified: -1 });
        }
      }
      if (conn && conn.status === 'not_configured') return null;
      return formatSafeConnection(conn);
    } catch (e) {
      console.error('Error reading connection metadata from MongoDB:', e.message);
      return null;
    }
  }

  async getConnectionWithCredential(idOrRepoId = null) {
    try {
      let conn = null;
      if (idOrRepoId) {
        conn = await Connection.findOne(buildConnectionQuery(idOrRepoId));
      } else {
        conn = await Connection.findOne({ key: 'active_connection' });
        if (!conn) {
          conn = await Connection.findOne({}).sort({ lastVerified: -1 });
        }
      }
      if (conn && conn.status === 'not_configured') return null;
      return conn;
    } catch (e) {
      console.error('Error reading internal connection credential from MongoDB:', e.message);
      return null;
    }
  }

  async saveConnection(connData) {
    try {
      const provider = (connData.provider || '').toLowerCase();
      const repositoryId = connData.repositoryId || '';
      const connId = connData.id || (provider && repositoryId ? `${provider}:${repositoryId}` : 'active_connection');

      if (connData.status === 'not_configured' || (!provider && !repositoryId)) {
        await Connection.deleteMany({});
        const updated = await Connection.findOneAndUpdate(
          { key: 'active_connection' },
          {
            id: 'active_connection',
            key: 'active_connection',
            provider: '',
            repositoryId: '',
            repositoryName: '',
            repositoryUrl: '',
            status: 'not_configured',
            lastVerified: new Date().toISOString()
          },
          { upsert: true, new: true }
        );
        return formatSafeConnection(updated);
      }

      // Re-assign active_connection key to the primary connection being saved
      await Connection.updateMany({ key: 'active_connection' }, { $unset: { key: 1 } });

      const updatePayload = {
        id: connId,
        key: 'active_connection',
        provider,
        repositoryId,
        repositoryName: connData.repositoryName || repositoryId,
        repositoryUrl: connData.repositoryUrl || '',
        status: connData.status || 'connected',
        lastVerified: new Date().toISOString()
      };

      if (connData.credential) updatePayload.credential = connData.credential;
      if (connData.userId) updatePayload.userId = connData.userId;
      if (connData.organizationId) updatePayload.organizationId = connData.organizationId;
      if (connData.workspaceId) updatePayload.workspaceId = connData.workspaceId;

      const query = buildConnectionQuery(connId) || { id: connId };
      const updated = await Connection.findOneAndUpdate(
        query,
        updatePayload,
        { upsert: true, new: true }
      );
      return formatSafeConnection(updated);
    } catch (e) {
      console.error('Error saving connection metadata to MongoDB:', e.message);
      return null;
    }
  }

  async deleteConnection(idOrRepoId) {
    try {
      if (!idOrRepoId) return false;
      const res = await Connection.deleteOne(buildConnectionQuery(idOrRepoId));
      return res.deletedCount > 0;
    } catch (e) {
      console.error('Error deleting connection from MongoDB:', e.message);
      return false;
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

  async findTaskByIdOrKey(taskId) {
    if (!taskId) return null;
    try {
      const cleanId = String(taskId).trim();
      const numOnly = cleanId.replace(/^task-/, '').replace(/^PLS-/, '');

      const possibleIds = Array.from(new Set([
        cleanId,
        `task-${cleanId}`,
        `task-${numOnly}`,
        numOnly
      ]));

      const possibleKeys = Array.from(new Set([
        cleanId,
        `PLS-${cleanId}`,
        `PLS-${numOnly}`,
        numOnly
      ]));

      const task = await Task.findOne({
        $or: [
          { id: { $in: possibleIds } },
          { key: { $in: possibleKeys } }
        ]
      });

      return task;
    } catch (e) {
      console.error('Error finding task by ID or key in MongoDB:', e.message);
      return null;
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
