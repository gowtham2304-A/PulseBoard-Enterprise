import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { store } from './store.js';
import { scoreTaskPriority } from './analyzer.js';
import { pipeline } from './pipeline.js';
import { startSourceControlPoller } from './poller.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

// 0. GET Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', provider: process.env.SOURCE_CONTROL_PROVIDER || 'github', timestamp: new Date().toISOString() });
});

// 1. GET Tasks (MongoDB Async)
app.get('/api/tasks', async (req, res) => {
  const tasks = await store.getTasks();
  res.json({ status: 'success', tasks });
});

// 1.1 GET Active User Session from MongoDB
app.get('/api/session', async (req, res) => {
  const currentUser = await store.getSession();
  res.json({ status: 'success', currentUser });
});

// 1.2 POST Update Active User Session to MongoDB
app.post('/api/session', async (req, res) => {
  const { currentUser } = req.body;
  if (!currentUser) {
    return res.status(400).json({ error: 'User is required' });
  }
  await store.saveSession(currentUser);
  res.json({ status: 'success', currentUser });
});

// 2. POST Create New Task (MongoDB Async)
app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  if (!task || !task.title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  // Auto assign AI priority based on PRD FR13
  const currentTasks = await store.getTasks();
  const calculatedPriority = await scoreTaskPriority(task.title, task.description || '', currentTasks, GEMINI_API_KEY);
  task.priority = calculatedPriority;

  // Ensure last activity timestamp is set
  if (!task.last_activity_time) {
    task.last_activity_time = new Date().toISOString();
  }

  await store.addTask(task);
  const tasks = await store.getTasks();
  res.json({ status: 'success', task, tasks });
});

// 3. PATCH Task Status (MongoDB Async)
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updatedTask = await store.updateTaskStatus(id, updates);
  if (!updatedTask) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ status: 'success', task: updatedTask });
});

// 4. DELETE Clear All Tasks (MongoDB Async)
app.delete('/api/tasks', async (req, res) => {
  await store.clearTasks();
  res.json({ status: 'success', tasks: [] });
});

// 5. GET Activity Log (MongoDB Async)
app.get('/api/activity', async (req, res) => {
  const activity = await store.getActivityLog();
  res.json({ status: 'success', activity });
});

// 6. POST Commit/Change Event (Processes change via normalized pipeline)
app.post('/api/commit', async (req, res) => {
  const body = req.body || {};
  let event;

  if (body.change && body.provider) {
    // Already normalized event
    event = body;
  } else {
    // Construct NormalizedChangeEvent from simulated commit payload
    const commitSHA = body.sha || Math.random().toString(16).substring(2, 9);
    const commitAuthor = body.author || 'Developer';
    const commitMsg = body.message || 'wip update';
    const commitDiff = body.diff || 'diff --git a/src/app.js b/src/app.js\n+ updated code';

    event = {
      provider: 'manual',
      repository: {
        id: 'manual',
        name: 'Manual Commit',
        url: ''
      },
      change: {
        id: commitSHA,
        message: commitMsg,
        author: {
          name: commitAuthor,
          email: ''
        },
        timestamp: new Date().toISOString()
      },
      changes: [
        {
          path: 'src/app.js',
          status: 'modified',
          additions: 10,
          deletions: 0,
          patch: commitDiff
        }
      ],
      rawDiff: commitDiff
    };
  }

  const result = await pipeline.processChangeEvent(event);

  const tasks = await store.getTasks();
  const activity = await store.getActivityLog();

  res.json({
    status: 'success',
    analysis: result.analysis,
    updatedTask: result.updatedTask,
    tasks,
    activity
  });
});

// 7. POST Chat Assistant Endpoint (Gemini Powered & MongoDB Async)
app.post('/api/chat', async (req, res) => {
  const { question, userName, userRole } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question required' });
  }

  const tasks = await store.getTasks();
  const activity = await store.getActivityLog();
  const isManager = userRole === 'Manager';

  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are PulseBoard AI, an autonomous project management assistant.
The user is "${userName || 'User'}" who is a "${userRole || 'Developer'}".
Answer naturally. Use their name and tailor for their role.

TASKS: ${JSON.stringify(tasks, null, 2)}
ACTIVITY: ${JSON.stringify(activity, null, 2)}
QUESTION: "${question}"

Be concise, use markdown, emojis, bold headers, and bullet points.`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text();
      return res.json({ status: 'success', answer });
    } catch (err) {
      console.error('Gemini chat error:', err.message);
    }
  }

  const qLower = question.toLowerCase();
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const reconTasks = tasks.filter(t => t.status === 'reconsideration');
  const myTasks = tasks.filter(t => t.assignee === userName);
  let answer;

  if (tasks.length === 0) {
    answer = isManager
      ? `📋 **No tasks yet, ${userName}!** Click "+ Create Task" to add and assign tasks.`
      : `📋 **No tasks assigned yet, ${userName}!** Wait for the Manager to create tasks.`;
  } else if (qLower.includes('status') || qLower.includes('update') || qLower.includes('overview')) {
    answer = `📊 **Project Status:**\n\n- 📝 To Do: **${todoTasks.length}**\n- 🔄 In Progress: **${inProgressTasks.length}**\n- 👀 In Review: **${reviewTasks.length}**\n- ✅ Done: **${doneTasks.length}**\n- ⚠️ Reconsideration: **${reconTasks.length}**\n\n**Total: ${tasks.length} tasks**`;
  } else if (qLower.includes('standup') || qLower.includes('summary') || qLower.includes('daily')) {
    let s = `📊 **Standup:**\n\n`;
    if (doneTasks.length) s += `✅ **Done:** ${doneTasks.map(t => t.title).join(', ')}\n`;
    if (inProgressTasks.length) s += `🔄 **In Progress:** ${inProgressTasks.map(t => `${t.title} (${t.assignee})`).join(', ')}\n`;
    if (reconTasks.length) s += `⚠️ **Attention:** ${reconTasks.map(t => t.title).join(', ')}`;
    answer = s;
  } else if (qLower.includes('work on') || qLower.includes('next') || qLower.includes('priority') || qLower.includes('should')) {
    const focus = isManager ? tasks : myTasks;
    const high = focus.filter(t => t.priority === 'high' && t.status !== 'done');
    answer = high.length
      ? `🎯 **Focus for ${userName}:**\n\n${high.map((t, i) => `${i + 1}. **${t.title}** — ${t.status.toUpperCase()}`).join('\n')}`
      : `✅ No high-priority items right now, ${userName}.`;
  } else if (qLower.includes('my task') || qLower.includes('assigned') || qLower.includes('mine')) {
    if (isManager) {
      answer = `👑 **All Tasks:**\n\n${tasks.map((t, i) => `${i + 1}. **${t.title}** → ${t.assignee} (${t.status.toUpperCase()})`).join('\n')}`;
    } else {
      answer = myTasks.length
        ? `📋 **Your Tasks, ${userName}:**\n\n${myTasks.map((t, i) => `${i + 1}. **${t.title}** — ${t.status.toUpperCase()}`).join('\n')}`
        : `📋 No tasks assigned to you yet, ${userName}.`;
    }
  } else if (qLower.includes('block') || qLower.includes('stuck') || qLower.includes('attention')) {
    answer = reconTasks.length
      ? `⚠️ **Needs Attention:**\n\n${reconTasks.map(t => `- **${t.title}** (${t.assignee})`).join('\n')}`
      : `✅ No blockers! Everything progressing well.`;
  } else if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('hey')) {
    answer = `👋 **Hey ${userName}!** (${userRole})\n\n📊 **${tasks.length} tasks** on the board. Ask me anything!`;
  } else if (qLower.includes('thank') || qLower.includes('great') || qLower.includes('good') || qLower.includes('nice')) {
    answer = `🙌 Happy to help, ${userName}! Keep pushing code — I'll track everything! 🚀`;
  } else if (qLower.includes('review') || qLower.includes('pr')) {
    answer = reviewTasks.length
      ? `👀 **In Review:**\n\n${reviewTasks.map(t => `- **${t.title}** by ${t.assignee}`).join('\n')}`
      : `📋 No tasks in review right now.`;
  } else if (qLower.includes('done') || qLower.includes('complete') || qLower.includes('finish')) {
    answer = doneTasks.length
      ? `✅ **Completed Tasks:**\n\n${doneTasks.map(t => `- **${t.title}** (${t.assignee})`).join('\n')}`
      : `📋 No completed tasks yet.`;
  } else {
    answer = `🤖 **Hi ${userName}!** (${userRole})\n\n📊 **${tasks.length} tasks** | To Do: ${todoTasks.length} | In Progress: ${inProgressTasks.length} | Done: ${doneTasks.length}\n${!isManager && myTasks.length ? `📋 You have **${myTasks.length}** tasks\n` : ''}\nAsk me:\n- *"Status update"* | *"What should I work on?"*\n- *"Show my tasks"* | *"Any blockers?"*`;
  }

  res.json({ status: 'success', answer });
});

app.listen(PORT, () => {
  console.log(`⚡ PulseBoard Express Backend running on http://localhost:${PORT}`);
  console.log(`🔗 Active Provider: "${process.env.SOURCE_CONTROL_PROVIDER || 'github'}"`);
  startSourceControlPoller();
});
