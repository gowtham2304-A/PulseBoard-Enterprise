/**
 * AIAnalyzer - Abstract Interface for PulseBoard AI Task Analysis Engines.
 * Decouples AI models (Gemini, Claude, GPT, PulseBoard Custom Model) from the source control layer.
 */
export class AIAnalyzer {
  /**
   * Evaluates code changes against project tasks.
   * @param {import('../pipeline.js').NormalizedChangeEvent} event
   * @param {Array<any>} tasks
   * @returns {Promise<{ matchedTaskId: string|null, newStatus: string, confidence: string, summary: string, reconsiderationReason: string }>}
   */
  async analyzeChangeEvent(event, tasks) {
    throw new Error('Method analyzeChangeEvent(event, tasks) must be implemented by subclass');
  }

  /**
   * Scores priority for a newly created task.
   * @param {string} title
   * @param {string} description
   * @param {Array<any>} existingTasks
   * @returns {Promise<string>} 'high' | 'medium' | 'low'
   */
  async scoreTaskPriority(title, description, existingTasks) {
    throw new Error('Method scoreTaskPriority() must be implemented by subclass');
  }
}
