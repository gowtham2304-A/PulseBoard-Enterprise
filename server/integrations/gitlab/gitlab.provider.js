import { SourceControlProvider } from '../base.provider.js';
import { GitLabClient } from './gitlab.client.js';

export class GitLabProvider extends SourceControlProvider {
  constructor(
    projectId = process.env.GITLAB_PROJECT_ID,
    token = process.env.GITLAB_TOKEN,
    baseUrl = process.env.GITLAB_URL || 'https://gitlab.com'
  ) {
    super();
    this.projectId = projectId;
    this.token = token;
    this.baseUrl = baseUrl;
    this.client = new GitLabClient(this.projectId, this.token, this.baseUrl);
  }

  getName() {
    return 'gitlab';
  }

  isConfigured() {
    return this.client.isConfigured();
  }

  async fetchChanges() {
    return await this.client.getLatestCommits();
  }

  async fetchChangeDetails(changeId) {
    const diffs = await this.client.getCommitDiff(changeId);
    const detail = await this.client.getCommitDetail(changeId);
    return { diffs, detail };
  }

  /**
   * Converts GitLab raw commit & diff objects into PulseBoard NormalizedChangeEvent
   */
  normalizeChange(rawChange, rawDetails) {
    if (!rawChange) {
      throw new Error('[GitLabProvider] Cannot normalize null or undefined commit');
    }

    const changeId = rawChange.id || rawChange.sha || rawChange.short_id || 'unknown-id';
    const message = rawChange.message || rawChange.title || 'No commit message';
    const authorName = rawChange.author_name || rawChange.committer_name || 'GitLab Developer';
    const authorEmail = rawChange.author_email || rawChange.committer_email || '';
    const timestamp = rawChange.authored_date || rawChange.committed_date || rawChange.created_at || new Date().toISOString();

    // Repository metadata
    const projId = String(this.projectId || rawChange.project_id || 'project');
    let repoUrl = `${this.baseUrl.replace(/\/+$/, '')}/${projId}`;
    if (rawChange.web_url) {
      // e.g. https://gitlab.com/owner/project/-/commit/abc1234 -> https://gitlab.com/owner/project
      const splitUrl = rawChange.web_url.split('/-/commit/');
      if (splitUrl.length > 1) {
        repoUrl = splitUrl[0];
      }
    }

    const repoName = repoUrl.split('/').pop() || projId;

    // Diff files parsing
    let diffList = [];
    if (Array.isArray(rawDetails)) {
      diffList = rawDetails;
    } else if (rawDetails && Array.isArray(rawDetails.diffs)) {
      diffList = rawDetails.diffs;
    } else if (rawChange.diffs && Array.isArray(rawChange.diffs)) {
      diffList = rawChange.diffs;
    }

    const changes = diffList.map(file => {
      const path = file.new_path || file.old_path || 'unknown';
      const status = this.mapFileStatus(file);
      const patch = file.diff || '';
      const { additions, deletions } = this.calculateLineStats(patch);

      return {
        path,
        status,
        additions,
        deletions,
        patch
      };
    });

    const rawDiff = changes.length > 0
      ? changes.map(c => `--- ${c.path}\n+++ ${c.path}\n${c.patch}`).join('\n\n')
      : (rawChange.diff || 'diff --git a/src/app.js b/src/app.js\n+ updated code');

    return {
      provider: this.getName(),
      repository: {
        id: projId,
        name: repoName,
        url: repoUrl
      },
      change: {
        id: changeId,
        message,
        author: {
          name: authorName,
          email: authorEmail
        },
        timestamp
      },
      changes,
      rawDiff
    };
  }

  mapFileStatus(file) {
    if (file.new_file) return 'added';
    if (file.deleted_file) return 'deleted';
    if (file.renamed_file) return 'renamed';
    return 'modified';
  }

  calculateLineStats(diffStr) {
    if (!diffStr) return { additions: 0, deletions: 0 };
    const lines = diffStr.split('\n');
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }
    return { additions, deletions };
  }
}
