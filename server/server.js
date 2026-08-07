import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { store } from './store.js';
import { analyzeDiffWithGemini } from './analyzer.js';
import { startGitHubPoller } from './poller.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/api/tasks', (req, res) => {
  res.json({ status: 'success', tasks: store.getTasks() });
});

app.post('/api/tasks', (req, res) => {
  const task = req.body;
  if (!task || !task.title) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  store.addTask(task);
  res.json({ status: 'success', task, tasks: store.getTasks() });
});

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updatedTask = store.updateTaskStatus(id, updates);
  if (!updatedTask) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ status: 'success', task: updatedTask });
});

app.delete('/api/tasks', (req, res) => {
  store.clearTasks();
  res.json({ status: 'success', tasks: [] });
});

app.get('/api/activity', (req, res) => {
  res.json({ status: 'success', activity: store.getActivityLog() });
});

app.post('/api/commit', async (req, res) => {
  const { sha, author, message, diff } = req.body;
  const commitSHA = sha || Math.random().toString(16).substring(2, 9);
  const commitAuthor = author || 'Developer';
  const commitMsg = message || 'wip update';
  const commitDiff = diff || 'diff --git a/src/app.js b/src/app.js\n+ updated code';

  const analysis = await analyzeDiffWithGemini(commitMsg, commitDiff, store.getTasks(), GEMINI_API_KEY);

  const updatedTask = store.updateTaskStatus(analysis.matchedTaskId, {
    status: analysis.newStatus,
    last_summary: analysis.summary,
    reconsideration_reason: analysis.reconsiderationReason || '',
    confidence: analysis.confidence
  });

  const logEntry = {
    id: Date.now().toString(),
    sha: commitSHA,
    author: commitAuthor,
    message: commitMsg,
    matchedTask: updatedTask ? updatedTask.title : 'Matched task',
    matchedTaskId: analysis.matchedTaskId,
    statusShift: `➔ ${analysis.newStatus}`,
    summary: analysis.summary,
    confidence: analysis.confidence,
    timestamp: new Date().toISOString()
  };

  store.addActivityLog(logEntry);

  res.json({
    status: 'success',
    analysis,
    updatedTask,
    tasks: store.getTasks(),
    activity: store.getActivityLog()
  });
});

app.post('/api/chat', async (req, res) => {
  const { question, userName, userRole } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question required' });
  }

  const tasks = store.getTasks();
  const activity = store.getActivityLog();
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
  startGitHubPoller(
    process.env.GITHUB_OWNER,
    process.env.GITHUB_REPO,
    process.env.GITHUB_TOKEN,
    GEMINI_API_KEY
  );
});
