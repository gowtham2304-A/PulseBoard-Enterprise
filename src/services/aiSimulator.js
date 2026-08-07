/**
 * PulseBoard AI Intelligence Simulator
 * Simulates Gemini / Groq structured JSON diff analysis and chat queries.
 */

export function analyzeCommitDiff(commitMessage, diffCode, tasks) {
  const messageLower = commitMessage.toLowerCase();
  const diffLower = diffCode.toLowerCase();

  let matchedTask = null;
  let score = 0;

  // 1. Task Matching Logic based on diff inspection + commit message
  tasks.forEach(task => {
    let currentScore = 0;
    const titleTokens = task.title.toLowerCase().split(' ');
    const descTokens = task.description.toLowerCase().split(' ');

    // Check tokens in diff
    titleTokens.forEach(token => {
      if (token.length > 3 && diffLower.includes(token)) currentScore += 3;
      if (token.length > 3 && messageLower.includes(token)) currentScore += 4;
    });

    descTokens.forEach(token => {
      if (token.length > 3 && diffLower.includes(token)) currentScore += 1;
    });

    // Specific domain matching rules
    if ((diffLower.includes('jwt') || diffLower.includes('refreshtoken') || diffLower.includes('cookie')) && task.id === 'task-101') {
      currentScore += 10;
    }
    if ((diffLower.includes('index') || diffLower.includes('schema') || diffLower.includes('commitevent')) && task.id === 'task-102') {
      currentScore += 10;
    }
    if ((diffLower.includes('grid') || diffLower.includes('column') || diffLower.includes('kanban')) && task.id === 'task-103') {
      currentScore += 10;
    }
    if ((diffLower.includes('websocket') || diffLower.includes('broadcast') || diffLower.includes('channel')) && task.id === 'task-104') {
      currentScore += 10;
    }
    if ((diffLower.includes('webhook') || diffLower.includes('stripe') || diffLower.includes('payment')) && task.id === 'task-106') {
      currentScore += 10;
    }

    if (currentScore > score) {
      score = currentScore;
      matchedTask = task;
    }
  });

  // Fallback if no specific match found
  if (!matchedTask) {
    matchedTask = tasks.find(t => t.status === 'in_progress') || tasks[0];
  }

  // 2. Status & Reconsideration Inference Logic
  let newStatus = matchedTask.status;
  let reconsiderationReason = '';
  let summary = '';

  if (matchedTask.status === 'done' || matchedTask.status === 'review') {
    // Reconsideration flow (FR11): New commit on completed work
    if (messageLower.includes('wip') || messageLower.includes('fix') || messageLower.includes('bug') || diffLower.includes('catch') || diffLower.includes('err')) {
      newStatus = 'reconsideration';
      reconsiderationReason = `Commit diff includes modification to verified logic ("${commitMessage}"). AI flagged potential unhandled regression.`;
      summary = `Reopened task: AI detected bug patch in completed code module.`;
    } else {
      newStatus = 'done';
      summary = `Updated docs & minor refactoring on completed module.`;
    }
  } else if (matchedTask.status === 'todo') {
    newStatus = 'in_progress';
    summary = `Started implementation: added initial boilerplate and module handlers.`;
  } else if (matchedTask.status === 'in_progress') {
    if (diffCode.length > 200 || diffLower.includes('return') || diffLower.includes('export')) {
      newStatus = 'review';
      summary = `Completed core logic implementation; submitted for peer review.`;
    } else {
      newStatus = 'in_progress';
      summary = `Ongoing progress: updated internal helper utilities and variable scope.`;
    }
  } else if (matchedTask.status === 'reconsideration') {
    newStatus = 'in_progress';
    summary = `Addressed reconsideration feedback: updated patch diff to fix regression.`;
  }

  const confidence = score > 8 ? 'high' : score > 4 ? 'medium' : 'low';

  return {
    matchedTaskId: matchedTask.id,
    matchedTaskTitle: matchedTask.title,
    newStatus,
    confidence,
    summary,
    reconsiderationReason,
    aiReasoning: `Matched diff patterns to task '${matchedTask.title}' with confidence ${confidence.toUpperCase()} based on code symbols and scope analysis.`
  };
}

export function generateChatAnswer(question, tasks, commitLogs, activeAssignee = 'Alex Chen') {
  const qLower = question.toLowerCase();

  // FR14: "What should I work on?"
  if (qLower.includes('work on') || qLower.includes('my task') || qLower.includes('next task') || qLower.includes('what should i do')) {
    const userTasks = tasks.filter(t => t.assignee.toLowerCase().includes(activeAssignee.toLowerCase().split(' ')[0]));
    const inProg = userTasks.filter(t => t.status === 'in_progress' || t.status === 'reconsideration');
    const highPri = userTasks.filter(t => t.priority === 'high' && t.status !== 'done');

    if (inProg.length > 0) {
      return `📌 **Priority Focus for ${activeAssignee}:**\n\nYou currently have **${inProg.length} active task(s)** requiring attention:\n\n1. **[${inProg[0].status.toUpperCase()}] ${inProg[0].title}**\n   - Priority: ${inProg[0].priority.toUpperCase()}\n   - Last Summary: *"${inProg[0].last_summary}"*\n\n👉 **Recommendation:** Finish this task before taking on new backlog items.`;
    } else if (highPri.length > 0) {
      return `✨ **Recommended Next Item for ${activeAssignee}:**\n\n1. **${highPri[0].title}** (Priority: HIGH)\n   - Description: ${highPri[0].description}`;
    } else {
      return `✅ **All clear, ${activeAssignee}!** You have no immediate blockers or in-progress tickets. Consider pulling from the **Todo** column: *"Optimize Database Query Indexes"*!`;
    }
  }

  // FR7 / FR15: Daily Standup Summary
  if (qLower.includes('standup') || qLower.includes('summary') || qLower.includes('today') || qLower.includes('progress')) {
    const completedToday = tasks.filter(t => t.status === 'done');
    const inReview = tasks.filter(t => t.status === 'review');
    const inReconsideration = tasks.filter(t => t.status === 'reconsideration');

    return `📊 **PulseBoard Daily Standup Summary (August 7, 2026)**\n\n` +
      `🟢 **Completed (${completedToday.length}):**\n` +
      completedToday.map(t => `- **${t.title}** (*${t.assignee}*): ${t.last_summary}`).join('\n') + `\n\n` +
      `🔵 **In Review (${inReview.length}):**\n` +
      inReview.map(t => `- **${t.title}** (*${t.assignee}*): ${t.last_summary}`).join('\n') + `\n\n` +
      `⚠️ **Needs Reconsideration (${inReconsideration.length}):**\n` +
      (inReconsideration.length > 0 
        ? inReconsideration.map(t => `- **${t.title}**: ${t.reconsideration_reason}`).join('\n')
        : '- None! All completed items are verified.') + `\n\n` +
      `💡 *Generated automatically from ${commitLogs.length} recent GitHub commit diff analyses.*`;
  }

  // Blocker / Reconsideration check
  if (qLower.includes('block') || qLower.includes('reconsideration') || qLower.includes('stuck') || qLower.includes('risk')) {
    const stuck = tasks.filter(t => t.status === 'reconsideration');
    if (stuck.length === 0) {
      return `🎉 **No critical blockers or reconsiderations flagged on the board!**`;
    }
    return `🚨 **Attention Needed on ${stuck.length} Task(s):**\n\n` +
      stuck.map(t => `- **${t.title}** (Assignee: ${t.assignee})\n  Reason: ${t.reconsideration_reason}`).join('\n\n');
  }

  // General questions fallback
  return `🤖 **PulseBoard AI Assistant:**\n\nI am watching your repository in real time. Currently, there are **${tasks.length} total tasks** across 5 columns.\n\nKey Activity:\n- In Progress: ${tasks.filter(t => t.status === 'in_progress').length}\n- Pending Review: ${tasks.filter(t => t.status === 'review').length}\n- Reconsideration Flags: ${tasks.filter(t => t.status === 'reconsideration').length}\n\nAsk me questions like *"What should I work on?"* or *"Summarize today's standup"*!`;
}
