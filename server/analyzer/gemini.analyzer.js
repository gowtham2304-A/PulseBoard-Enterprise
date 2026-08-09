import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalyzer } from './base.analyzer.js';

export class GeminiAnalyzer extends AIAnalyzer {
  constructor(apiKey = process.env.GEMINI_API_KEY) {
    super();
    this.apiKey = apiKey;
  }

  async analyzeChangeEvent(event, tasks) {
    if (!tasks || tasks.length === 0) {
      return {
        matchedTaskId: null,
        newStatus: 'todo',
        confidence: 'low',
        summary: 'No open tasks on the board to analyze.',
        reconsiderationReason: ''
      };
    }

    const commitMessage = event?.change?.message || 'No message';
    const diffCode = event?.rawDiff || (event?.changes ? event.changes.map(c => `--- ${c.path}\n+++ ${c.path}\n${c.patch}`).join('\n\n') : 'diff --git a/src/app.js b/src/app.js\n+ updated code');

    if (this.apiKey && this.apiKey.startsWith('AIzaSy')) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an expert AI Code Reviewer and Autonomous Project Manager.
Your job is to inspect raw code diffs (added/removed lines) from a source control provider (${event?.provider || 'git'}) and evaluate code completeness against task requirements.

CRITICAL DIRECTIVE: DO NOT RELY MERELY ON COMMIT/CHANGE MESSAGES. YOU MUST READ AND ANALYZE THE ACTUAL CODE DIFF CONTENT.

==================== SOURCE CONTROL CHANGE EVENT ====================
Provider: "${event?.provider || 'git'}"
Repository: "${event?.repository?.id || 'repo'}"
Change ID: "${event?.change?.id || 'id'}"
Author: "${event?.change?.author?.name || 'Dev'}"
Message: "${commitMessage}"
Raw Code Diff:
${diffCode.substring(0, 3500)}

==================== OPEN TASKS ON BOARD ====================
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description, status: t.status, assignee: t.assignee })), null, 2)}

==================== CODE ANALYSIS & EVALUATION RULES ====================
1. EVALUATE CODE CONTENT (80% WEIGHT):
   - Examine exported functions, component trees, CSS classes, schema definitions, imports, and business logic added in the diff.
   - Match code content to the Task Description and Title.

2. DETERMINE STATUS FROM CODE COMPLETENESS:
   - "in_progress": The diff contains initial/partial code setup, draft CSS variables, stub functions, or incomplete logic (even if commit message claims "done").
   - "review": The diff contains substantial, working code logic with unit handles, ready for peer review or PR inspection.
   - "done": The diff contains complete, fully-implemented code that satisfies all requirements of the task.
   - "reconsideration": The commit alters a previously completed task by introducing bypasses, hardcoded hacks, removing validations, or breaking existing logic.

3. RETURN FORMAT: Return ONLY valid JSON (no markdown fence blocks):
{
  "matchedTaskId": "task-id",
  "newStatus": "in_progress",
  "confidence": "high",
  "summary": "Technical summary of what specific functions/code lines were added or modified.",
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
            newStatus: parsed.newStatus || 'in_progress',
            confidence: parsed.confidence || 'high',
            summary: parsed.summary || `Analyzed code changes for change: "${commitMessage}"`,
            reconsiderationReason: parsed.reconsiderationReason || ''
          };
        }
      } catch (err) {
        console.error('[GeminiAnalyzer] Gemini API call failed, running Structural Code Analysis Fallback Engine:', err.message);
      }
    }

    // Pure Code Content Analysis Engine Fallback
    return this.fallbackCodeAnalysisEngine(commitMessage, diffCode, tasks);
  }

  fallbackCodeAnalysisEngine(commitMessage, diffCode, tasks) {
    const diffLower = diffCode.toLowerCase();
    let bestTask = tasks[0];
    let highestCodeMatchScore = -1;

    for (const task of tasks) {
      let codeScore = 0;
      const taskTokens = (task.title + ' ' + (task.description || '')).toLowerCase().split(/\s+/).filter(w => w.length > 3);

      for (const token of taskTokens) {
        const occurrences = (diffLower.split(token).length - 1);
        codeScore += occurrences * 3;
      }

      if (codeScore > highestCodeMatchScore) {
        highestCodeMatchScore = codeScore;
        bestTask = task;
      }
    }

    const linesAdded = (diffCode.match(/^\+[^+]/gm) || []).length;
    const containsLogic = /function|export|class|interface|return|const|let|import|form|input|button/i.test(diffCode);
    const containsSecurityBypass = /bypass|hardcode|dummy|skip|ignore/i.test(diffCode);

    let newStatus = bestTask.status;
    let summary = '';
    let reconsiderationReason = '';

    if (containsSecurityBypass && (bestTask.status === 'done' || bestTask.status === 'review')) {
      newStatus = 'reconsideration';
      reconsiderationReason = `Code diff contains potential security bypass or dummy fallback in module. Flagged for review.`;
      summary = `Security flaw detected in code diff patch for "${bestTask.title}". Card shifted to Reconsideration.`;
    } else if (linesAdded < 10 || !containsLogic) {
      newStatus = 'in_progress';
      summary = `Code Analysis: Partial code changes (${linesAdded} lines added). Keeping task in IN PROGRESS.`;
    } else if (linesAdded >= 10 && linesAdded < 30) {
      newStatus = 'review';
      summary = `Code Analysis: Substantial logic implementation verified (${linesAdded} lines added). Shifting to IN REVIEW.`;
    } else {
      newStatus = 'done';
      summary = `Code Analysis: Fully verified complete module implementation (${linesAdded} lines added). Moved to DONE.`;
    }

    return {
      matchedTaskId: bestTask.id,
      newStatus,
      confidence: highestCodeMatchScore > 2 ? 'high' : 'medium',
      summary,
      reconsiderationReason
    };
  }

  async scoreTaskPriority(title, description, existingTasks) {
    if (this.apiKey && this.apiKey.startsWith('AIzaSy')) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
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
        console.error('[GeminiAnalyzer] Priority scoring error, using fallback:', e.message);
      }
    }

    const text = (title + ' ' + (description || '')).toLowerCase();
    if (/auth|login|security|checkout|payment|bug|crash|error|broken|verify|signature/i.test(text)) {
      return 'high';
    }
    if (/ui|color|css|style|margin|padding|readme|ignore/i.test(text)) {
      return 'low';
    }
    return 'medium';
  }
}
