import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, User, Terminal } from 'lucide-react';

export function AIChatAssistant({ isOpen, onClose, tasks, commitLog, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const role = currentUser?.isManager ? 'Manager' : 'Developer';
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: `👋 **Hi ${currentUser?.name || 'there'}!** (${role})\n\nI'm PulseBoard AI — I monitor your repository and task board in real-time. Ask me anything about tasks, progress, blockers, or team priorities!`
      }
    ]);
  }, [currentUser?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const quickPrompts = currentUser?.isManager
    ? [
        "Give me a project status update",
        "Who is blocked right now?",
        "Summarize today's standup",
        "What tasks need attention?"
      ]
    : [
        "What should I work on next?",
        "Show my assigned tasks",
        "Any blockers on my tasks?",
        "What's in review right now?"
      ];

  const handleSend = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          userName: currentUser?.name || 'User',
          userRole: currentUser?.isManager ? 'Manager' : 'Developer'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const aiMsg = { id: (Date.now() + 1).toString(), sender: 'ai', text: data.answer };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        return;
      }
    } catch (err) {
      console.log('Backend chat offline, using local fallback');
    }

    setTimeout(() => {
      const answer = buildLocalResponse(query, tasks, commitLog, currentUser);
      const aiMsg = { id: (Date.now() + 1).toString(), sender: 'ai', text: answer };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-heading text-slate-900">PulseBoard AI Chat</h2>
            <p className="text-[11px] text-slate-500">
              Chatting as <span className="text-blue-700 font-semibold">{currentUser?.name}</span> ({currentUser?.isManager ? 'Manager' : 'Developer'})
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans whitespace-pre-wrap shadow-sm'
              }`}
            >
              {msg.text}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-blue-600 font-mono italic">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>AI analyzing board context...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
          <Terminal className="w-3 h-3 text-blue-600" />
          <span>Quick Queries:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-[11px] text-slate-700 transition-all hover:text-blue-700 text-left font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Form Input */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about your project..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function buildLocalResponse(query, tasks, commitLog, currentUser) {
  const q = query.toLowerCase();
  const name = currentUser?.name || 'User';
  const isManager = currentUser?.isManager;

  const myTasks = tasks.filter(t => t.assignee === name);
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const reconTasks = tasks.filter(t => t.status === 'reconsideration');

  if (tasks.length === 0) {
    if (isManager) {
      return `📋 **No tasks on the board yet, ${name}!**\n\nAs the Manager, you can:\n- Click **"+ Create New Task"** to add tasks\n- Assign them to team members\n- Once code is pushed, cards move automatically!`;
    }
    return `📋 **No tasks assigned yet, ${name}!**\n\nWait for the Manager to create tasks. Push code to GitHub and they'll update automatically!`;
  }

  if (q.includes('status') || q.includes('update') || q.includes('overview')) {
    return `📊 **Project Status Update:**\n\n- 📝 To Do: **${todoTasks.length}**\n- 🔄 In Progress: **${inProgressTasks.length}**\n- 👀 In Review: **${reviewTasks.length}**\n- ✅ Done: **${doneTasks.length}**\n- ⚠️ Reconsideration: **${reconTasks.length}**\n\n**Total: ${tasks.length} tasks**`;
  }

  if (q.includes('standup') || q.includes('summary')) {
    let summary = `📊 **Daily Standup Summary:**\n\n`;
    if (doneTasks.length > 0) summary += `✅ **Completed:** ${doneTasks.map(t => t.title).join(', ')}\n\n`;
    if (inProgressTasks.length > 0) summary += `🔄 **In Progress:** ${inProgressTasks.map(t => `${t.title} (${t.assignee})`).join(', ')}\n\n`;
    if (reviewTasks.length > 0) summary += `👀 **In Review:** ${reviewTasks.map(t => t.title).join(', ')}\n\n`;
    if (reconTasks.length > 0) summary += `⚠️ **Needs Attention:** ${reconTasks.map(t => t.title).join(', ')}`;
    return summary;
  }

  if (q.includes('work on') || q.includes('next') || q.includes('priority')) {
    const priorityTasks = isManager ? tasks : myTasks;
    const highPriority = priorityTasks.filter(t => t.priority === 'high' && t.status !== 'done');
    if (highPriority.length > 0) {
      return `🎯 **Recommended Focus for ${name}:**\n\n${highPriority.map((t, i) => `${i + 1}. **${t.title}** — Priority: HIGH, Status: ${t.status.toUpperCase()}`).join('\n')}`;
    }
    return `✅ **All clear, ${name}!** No pending high priority tasks.`;
  }

  return `🤖 **Hi ${name}!** (${isManager ? 'Manager' : 'Developer'})\n\n📊 **${tasks.length} tasks** on board.\nAsk me about project status, team priorities, or blockers!`;
}
