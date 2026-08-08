import { GoogleGenerativeAI } from '@google/generative-ai';

export async function analyzeDiffWithGemini(commitMessage, diffCode, tasks, apiKey) {
  if (!tasks || tasks.length === 0) {
    return {
      matchedTaskId: null,
      newStatus: 'todo',
      confidence: 'low',
      summary: 'No open tasks on the board to analyze.',
      reconsiderationReason: ''
    };
  }

  if (apiKey && apiKey.startsWith('AIzaSy')) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert AI Code Reviewer and Autonomous Project Manager.

CRITICAL PRINCIPLE: Managers write tasks in high-level human goals (e.g., "Swap brand color to Emerald", "Build user login endpoint", "Fix checkout crash") WITHOUT knowing developer variable names, internal function names, or file paths.

YOUR MANDATE: Perform FUNCTIONAL GOAL & OUTCOME MATCHING between the Manager's Task Intent and the Developer's Committed Code Patch.

==================== COMMITTED CODE DIFF ====================
Commit Message: "${commitMessage}"
Raw Code Diff:
${diffCode.substring(0, 3500)}

==================== OPEN TASKS ON BOARD ====================
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description, status: t.status, assignee: t.assignee })), null, 2)}

==================== EVALUATION RULES ====================
1. MATCH TASK BY FUNCTIONAL INTENT:
   Compare the high-level intent of the task title/description with the outcome of the code diff + commit message.
   - Example: A task asking for "color swap" matches a diff changing CSS classes or hex colors.
   - Example: A task asking for "login endpoint" matches a diff adding auth/route handlers.

2. EVALUATE COMPLETENESS (DESIRED OUTCOME SATISFIED):
   - "done": The code change fulfills the functional goal requested by the manager (even if 1-2 lines, if it fulfills the desired outcome, mark it as DONE!).
   - "reconsideration": If the commit introduces security bypasses, hardcoded hacks, dummy fallbacks, or removes checks (regardless of whether the task is in To Do, In Progress, Review, or Done).
   - "in_progress": ONLY if the commit is explicitly labeled as WIP, draft, stub, or partial setup.

3. RETURN FORMAT (ONLY valid JSON, no markdown fences):
{
  "matchedTaskId": "task-id",
  "newStatus": "done",
  "confidence": "high",
  "summary": "Plain-English explanation of how the code change satisfied the manager's task requirement.",
  "reconsiderationReason": ""
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          matchedTaskId: parsed.matchedTaskId || tasks[0].id,
          newStatus: parsed.newStatus || 'done',
          confidence: parsed.confidence || 'high',
          summary: parsed.summary || `Analyzed code diff for commit: "${commitMessage}"`,
          reconsiderationReason: parsed.reconsiderationReason || ''
        };
      }
    } catch (err) {
      console.error('Gemini API call failed, running Code Intent Analysis Engine:', err.message);
    }
  }

  // Pure Functional Goal & Intent Engine (Fallback)
  return codeContentAnalysisEngine(commitMessage, diffCode, tasks);
}

function codeContentAnalysisEngine(commitMessage, diffCode, tasks) {
  const text = (diffCode + " " + commitMessage).toLowerCase();

  // 1. Semantic Domain Matching between Manager Goal & Developer Code Diff
  let bestTask = tasks[0];
  let highestScore = -1;

  for (const task of tasks) {
    let score = 0;
    const taskText = (task.title + " " + (task.description || "")).toLowerCase();

    // Word relevance check
    const words = taskText.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      if (text.includes(word)) score += 5;
    }

    // Domain concept mapping
    if (/color|css|style|theme|emerald|blue|red|dark|light|ui|button|bg-/i.test(taskText) &&
        /color|css|style|theme|emerald|blue|red|dark|light|ui|button|bg-|flex|border/i.test(text)) {
      score += 20;
    }

    if (/api|route|endpoint|backend|server|express|post|get|fetch|health/i.test(taskText) &&
        /api|route|endpoint|backend|server|express|app\.|req|res|json/i.test(text)) {
      score += 20;
    }

    if (/auth|login|jwt|token|user|password|security|session/i.test(taskText) &&
        /auth|login|jwt|token|user|password|security|session/i.test(text)) {
      score += 20;
    }

    if (score > highestScore) {
      highestScore = score;
      bestTask = task;
    }
  }

  // 2. High-Accuracy Goal Satisfaction Evaluation
  const containsSecurityBypass = /bypass|hardcode|dummy|skip|ignore/i.test(text);
  const isWIP = /wip|draft|work in progress|partial|incomplete|stub/i.test(commitMessage.toLowerCase());

  let newStatus = 'done';
  let summary = `Functional Goal Satisfied: Verified code patch for "${bestTask.title}". Task marked as DONE.`;
  let reconsiderationReason = '';

  if (containsSecurityBypass) {
    newStatus = 'reconsideration';
    reconsiderationReason = `Code diff contains potential security bypass or dummy fallback. Flagged for manager review.`;
    summary = `Security flaw detected in code diff patch for "${bestTask.title}". Card shifted to Reconsideration.`;
  } else if (isWIP) {
    newStatus = 'in_progress';
    summary = `Partial setup commit detected for "${bestTask.title}". Card shifted to IN PROGRESS.`;
  }

  return {
    matchedTaskId: bestTask.id,
    newStatus,
    confidence: highestScore > 0 ? 'high' : 'medium',
    summary,
    reconsiderationReason
  };
}

export async function scoreTaskPriority(title, description, existingTasks, apiKey) {
  if (apiKey && apiKey.startsWith('AIzaSy')) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Analyze this task and assign a priority ('high', 'medium', 'low') based on critical backend/security logic, database schema, payment requirements, or blocker status.
Task Title: "${title}"
Task Description: "${description}"

Other Board Tasks: ${JSON.stringify(existingTasks.map(t => ({ title: t.title, priority: t.priority })))}

Return ONLY valid JSON (no markdown):
{ "priority": "high", "reason": "why" }`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (['high', 'medium', 'low'].includes(parsed.priority)) {
          return parsed.priority;
        }
      }
    } catch (e) {
      console.error('Priority scoring AI error, using fallback:', e.message);
    }
  }
  return fallbackPriorityScoring(title, description);
}

function fallbackPriorityScoring(title, description) {
  const text = (title + " " + (description || "")).toLowerCase();
  if (/auth|login|security|checkout|payment|bug|crash|error|broken|verify|signature/i.test(text)) {
    return 'high';
  }
  if (/ui|color|css|style|margin|padding|readme|ignore/i.test(text)) {
    return 'low';
  }
  return 'medium';
}
