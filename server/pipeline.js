import { store } from './store.js';
import { GeminiAnalyzer } from './analyzer/gemini.analyzer.js';
import { parsePulseBoardTaskId } from './task-id.parser.js';

export class PulseBoardPipeline {
  constructor(analyzer = null) {
    this.analyzer = analyzer || new GeminiAnalyzer();
  }

  /**
   * Main entry point for processing any NormalizedChangeEvent from any source control provider/agent/webhook.
   * @param {import('./integrations/base.provider.js').NormalizedChangeEvent} event
   * @returns {Promise<{ processed: boolean, analysis?: any, updatedTask?: any, reason?: string }>}
   */
  async processChangeEvent(event) {
    if (!event || !event.change || !event.change.id) {
      console.log('[Pipeline] Invalid change event payload. Skipping.');
      return { processed: false, reason: 'Invalid payload' };
    }

    const changeId = event.change.id;
    const shortId = changeId.substring(0, 7);

    // 1. Check idempotency (scoped by provider + repository + changeId)
    const processed = await store.hasProcessedChange(
      changeId,
      event.provider || null,
      event.repository?.id || null
    );
    if (processed) {
      console.log(`[Pipeline] Change ${shortId} already processed. Skipping.`);
      return { processed: false, reason: 'Already processed' };
    }

    console.log(`[Pipeline] Processing change [${event.provider || 'git'}] #${shortId}: "${event.change.message}"`);

    // 2. Parse explicit PulseBoard Task ID prefix [PLS-953]
    const parsedTag = parsePulseBoardTaskId(event.change.message);

    if (parsedTag.hasTaskId) {
      console.log(`[Pipeline] Explicit PulseBoard Task ID detected: "${parsedTag.taskId}" (Tag: ${parsedTag.rawTag})`);

      // Search for exact existing task in database
      const explicitTask = await store.findTaskByIdOrKey(parsedTag.taskId);

      if (!explicitTask) {
        console.log(`[Pipeline] Referenced PulseBoard task "${parsedTag.taskId}" was not found in database.`);
        const logEntry = {
          id: Date.now().toString(),
          provider: event.provider || 'unknown',
          repositoryId: event.repository?.id || '',
          repositoryName: event.repository?.name || '',
          changeId: shortId,
          sha: shortId,
          author: event.change.author?.name || 'Developer',
          message: event.change.message,
          matchedTask: 'Referenced task not found',
          matchedTaskId: null,
          statusShift: 'none',
          summary: `Referenced PulseBoard task ${parsedTag.taskId} was not found.`,
          confidence: 'low',
          timestamp: new Date().toISOString()
        };
        await store.addActivityLog(logEntry);
        return { processed: true, analysis: null, updatedTask: null, reason: `Referenced PulseBoard task ${parsedTag.taskId} was not found.` };
      }

      // Explicit task found! Construct clean event for targeted AI analysis
      const cleanEvent = {
        ...event,
        change: {
          ...event.change,
          message: parsedTag.cleanMessage
        }
      };

      const analysis = await this.analyzer.analyzeChangeEvent(cleanEvent, [explicitTask]);
      const targetStatus = (analysis && analysis.newStatus) ? analysis.newStatus : (explicitTask.status === 'todo' ? 'in_progress' : explicitTask.status);
      const summaryText = (analysis && analysis.summary) ? analysis.summary : `Explicit commit [${parsedTag.rawTag}] matched to task ${explicitTask.key || explicitTask.id}.`;
      const confidenceLevel = (analysis && analysis.confidence) ? analysis.confidence : 'high';

      // Update matched task state in database
      const updatedTask = await store.updateTaskStatus(explicitTask.id, {
        status: targetStatus,
        last_summary: summaryText,
        reconsideration_reason: analysis?.reconsiderationReason || '',
        confidence: confidenceLevel,
        last_activity_time: new Date().toISOString()
      });

      // Add activity log entry
      const logEntry = {
        id: Date.now().toString(),
        provider: event.provider || 'unknown',
        repositoryId: event.repository?.id || '',
        repositoryName: event.repository?.name || '',
        changeId: shortId,
        sha: shortId,
        author: event.change.author?.name || 'Developer',
        message: event.change.message,
        matchedTask: explicitTask.key || (updatedTask ? updatedTask.title : explicitTask.title),
        matchedTaskId: explicitTask.id,
        statusShift: `➔ ${targetStatus}`,
        summary: summaryText,
        confidence: confidenceLevel,
        timestamp: new Date().toISOString()
      };
      await store.addActivityLog(logEntry);

      console.log(`[Pipeline] Explicit task updated: "${explicitTask.key || updatedTask?.title}" ➔ ${targetStatus}`);
      return { processed: true, analysis: { matchedTaskId: explicitTask.id, newStatus: targetStatus, summary: summaryText, confidence: confidenceLevel }, updatedTask };
    }

    // 3. Fallback: No explicit Task ID prefix — use AI Task Matching
    const currentTasks = await store.getTasks();
    if (currentTasks.length === 0) {
      console.log('[Pipeline] No open tasks on board. Logging unmatched change.');
      const logEntry = {
        id: Date.now().toString(),
        provider: event.provider || 'unknown',
        repositoryId: event.repository?.id || '',
        repositoryName: event.repository?.name || '',
        changeId: shortId,
        sha: shortId,
        author: event.change.author?.name || 'Developer',
        message: event.change.message,
        matchedTask: 'No tasks on board',
        matchedTaskId: null,
        statusShift: 'none',
        summary: 'Change detected but no board tasks present.',
        confidence: 'low',
        timestamp: new Date().toISOString()
      };
      await store.addActivityLog(logEntry);
      return { processed: true, analysis: null, updatedTask: null };
    }

    // Perform AI Fallback Matching
    const analysis = await this.analyzer.analyzeChangeEvent(event, currentTasks);

    if (!analysis || !analysis.matchedTaskId) {
      console.log('[Pipeline] No matching task found for this change.');
      const logEntry = {
        id: Date.now().toString(),
        provider: event.provider || 'unknown',
        repositoryId: event.repository?.id || '',
        repositoryName: event.repository?.name || '',
        changeId: shortId,
        sha: shortId,
        author: event.change.author?.name || 'Developer',
        message: event.change.message,
        matchedTask: 'No match found',
        matchedTaskId: null,
        statusShift: 'none',
        summary: analysis?.summary || 'Could not match change to any board task.',
        confidence: 'low',
        timestamp: new Date().toISOString()
      };
      await store.addActivityLog(logEntry);
      return { processed: true, analysis, updatedTask: null };
    }

    // Update task state in database
    const updatedTask = await store.updateTaskStatus(analysis.matchedTaskId, {
      status: analysis.newStatus,
      last_summary: analysis.summary,
      reconsideration_reason: analysis.reconsiderationReason || '',
      confidence: analysis.confidence,
      last_activity_time: new Date().toISOString()
    });

    // Add activity log record
    const logEntry = {
      id: Date.now().toString(),
      provider: event.provider || 'unknown',
      repositoryId: event.repository?.id || '',
      repositoryName: event.repository?.name || '',
      changeId: shortId,
      sha: shortId,
      author: event.change.author?.name || 'Developer',
      message: event.change.message,
      matchedTask: updatedTask ? updatedTask.title : 'Matched task',
      matchedTaskId: analysis.matchedTaskId,
      statusShift: `➔ ${analysis.newStatus}`,
      summary: analysis.summary,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString()
    };
    await store.addActivityLog(logEntry);

    console.log(`[Pipeline] Task updated via AI matching: "${updatedTask?.title}" ➔ ${analysis.newStatus}`);
    return { processed: true, analysis, updatedTask };
  }
}

export const pipeline = new PulseBoardPipeline();
