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
  confidence: String
});

// Activity Log Schema
const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sha: String,
  author: String,
  message: String,
  matchedTask: String,
  matchedTaskId: String,
  statusShift: String,
  summary: String,
  confidence: String,
  timestamp: { type: String, default: () => new Date().toISOString() }
});

const Task = mongoose.model('Task', TaskSchema);
const Activity = mongoose.model('Activity', ActivitySchema);

class Store {
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
      const task = new Task({
        ...taskData,
        last_activity_time: taskData.last_activity_time || new Date().toISOString()
      });
      await task.save();
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
      const log = new Activity(logEntry);
      await log.save();
    } catch (e) {
      console.error('Error adding activity log to MongoDB:', e.message);
    }
  }

  async hasProcessedSHA(sha) {
    if (!sha) return false;
    try {
      const match = await Activity.findOne({ sha });
      return !!match;
    } catch (e) {
      return false;
    }
  }
}

export const store = new Store();
