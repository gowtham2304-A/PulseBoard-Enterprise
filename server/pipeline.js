import { store } from './store.js';
import { GeminiAnalyzer } from './analyzer/gemini.analyzer.js';

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

    // 2. Fetch active board tasks
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

    // 3. Perform AI Analysis
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

    // 4. Update task state in database
    const updatedTask = await store.updateTaskStatus(analysis.matchedTaskId, {
      status: analysis.newStatus,
      last_summary: analysis.summary,
      reconsideration_reason: analysis.reconsiderationReason || '',
      confidence: analysis.confidence,
      last_activity_time: new Date().toISOString()
    });

    // 5. Add provider-agnostic activity log record
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

    console.log(`[Pipeline] Task updated: "${updatedTask?.title}" ➔ ${analysis.newStatus}`);
    return { processed: true, analysis, updatedTask };
  }
}

export const pipeline = new PulseBoardPipeline();
