import { GeminiAnalyzer } from './analyzer/gemini.analyzer.js';

/**
 * Backward-compatible helper to analyze diffs. Accepts either a NormalizedChangeEvent object
 * or (commitMessage, diffCode, tasks, apiKey).
 */
export async function analyzeDiffWithGemini(arg1, arg2, arg3, arg4) {
  let event;
  let tasks;
  let apiKey;

  if (typeof arg1 === 'object' && arg1 !== null && arg1.change) {
    // Called with (NormalizedChangeEvent, tasks, apiKey)
    event = arg1;
    tasks = arg2;
    apiKey = arg3;
  } else {
    // Called with legacy signature: (commitMessage, diffCode, tasks, apiKey)
    const commitMessage = arg1 || 'No commit message';
    const diffCode = arg2 || 'diff --git a/src/app.js b/src/app.js\n+ updated code';
    tasks = arg3;
    apiKey = arg4;

    event = {
      provider: 'git',
      repository: { id: 'local/repo', name: 'repo', url: '' },
      change: {
        id: Math.random().toString(16).substring(2, 9),
        message: commitMessage,
        author: { name: 'Developer', email: '' },
        timestamp: new Date().toISOString()
      },
      changes: [
        {
          path: 'src/app.js',
          status: 'modified',
          additions: 10,
          deletions: 0,
          patch: diffCode
        }
      ],
      rawDiff: diffCode
    };
  }

  const analyzer = new GeminiAnalyzer(apiKey);
  return await analyzer.analyzeChangeEvent(event, tasks);
}

export async function scoreTaskPriority(title, description, existingTasks, apiKey) {
  const analyzer = new GeminiAnalyzer(apiKey);
  return await analyzer.scoreTaskPriority(title, description, existingTasks);
}
