import { store } from './store.js';
import { analyzeDiffWithGemini } from './analyzer.js';

export function startGitHubPoller(owner, repo, token, apiKey, intervalMs = 10000) {
  if (!owner || !repo || !token) {
    console.log('[Poller] GitHub token/repo not fully configured. Using simulation mode for commit pushes.');
    return;
  }

  console.log(`[Poller] Started watching GitHub repo: ${owner}/${repo} (Interval: ${intervalMs}ms)`);

  setInterval(async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PulseBoard-Autonomous-Agent'
        }
      });

      if (!response.ok) return;

      const commits = await response.json();
      if (!Array.isArray(commits) || commits.length === 0) return;

      const latestCommit = commits[0];
      const sha = latestCommit.sha.substring(0, 7);

      if (store.hasProcessedSHA(sha)) {
        return; // Already processed
      }

      // Fetch single commit details to get raw diff patch
      const detailRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${latestCommit.sha}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PulseBoard-Autonomous-Agent'
        }
      });

      let diffPatch = '';
      let fileList = [];
      if (detailRes.ok) {
        const detail = await detailRes.json();
        fileList = detail.files ? detail.files.map(f => f.filename) : [];
        diffPatch = detail.files ? detail.files.map(f => `--- ${f.filename}\n+++ ${f.filename}\n${f.patch || ''}`).join('\n\n') : '';
      }

      console.log(`[Poller] New live commit detected on GitHub: #${sha} "${latestCommit.commit.message}"`);

      const currentTasks = store.getTasks();
      if (currentTasks.length === 0) {
        console.log('[Poller] No tasks on board yet. Skipping analysis.');
        store.addActivityLog({
          id: Date.now().toString(),
          sha,
          author: latestCommit.commit.author.name || 'GitHub Developer',
          message: latestCommit.commit.message,
          matchedTask: 'No tasks on board',
          matchedTaskId: null,
          statusShift: 'none',
          summary: 'Commit detected but no tasks to match against.',
          confidence: 'low',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Run Gemini LLM analysis
      const analysis = await analyzeDiffWithGemini(
        latestCommit.commit.message,
        diffPatch || 'diff --git a/src/app.js b/src/app.js\n+ updated code',
        currentTasks,
        apiKey
      );

      if (!analysis || !analysis.matchedTaskId) {
        console.log('[Poller] No matching task found for this commit.');
        store.addActivityLog({
          id: Date.now().toString(),
          sha,
          author: latestCommit.commit.author.name || 'GitHub Developer',
          message: latestCommit.commit.message,
          matchedTask: 'No match found',
          matchedTaskId: null,
          statusShift: 'none',
          summary: analysis?.summary || 'Could not match commit to any task.',
          confidence: 'low',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update store state
      const updatedTask = store.updateTaskStatus(analysis.matchedTaskId, {
        status: analysis.newStatus,
        last_summary: analysis.summary,
        reconsideration_reason: analysis.reconsiderationReason || '',
        confidence: analysis.confidence
      });

      // Log event
      store.addActivityLog({
        id: Date.now().toString(),
        sha,
        author: latestCommit.commit.author.name || 'GitHub Developer',
        message: latestCommit.commit.message,
        matchedTask: updatedTask ? updatedTask.title : 'Task matched',
        matchedTaskId: analysis.matchedTaskId,
        statusShift: `➔ ${analysis.newStatus}`,
        summary: analysis.summary,
        confidence: analysis.confidence,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('[Poller Error]:', err.message);
    }
  }, intervalMs);
}
