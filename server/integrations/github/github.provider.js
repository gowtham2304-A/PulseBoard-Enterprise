import { SourceControlProvider } from '../base.provider.js';
import { GitHubClient } from './github.client.js';

export class GitHubProvider extends SourceControlProvider {
  constructor(owner = process.env.GITHUB_OWNER, repo = process.env.GITHUB_REPO, token = process.env.GITHUB_TOKEN) {
    super();
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.client = new GitHubClient(this.owner, this.repo, this.token);
  }

  getName() {
    return 'github';
  }

  isConfigured() {
    return this.client.isConfigured();
  }

  async fetchChanges() {
    return await this.client.getLatestCommits();
  }

  async fetchChangeDetails(changeId) {
    return await this.client.getCommitDetail(changeId);
  }

  /**
   * Converts GitHub raw commit & detail objects into PulseBoard NormalizedChangeEvent
   */
  normalizeChange(rawCommit, rawDetails) {
    if (!rawCommit) {
      throw new Error('[GitHubProvider] Cannot normalize null or undefined commit');
    }

    const sha = rawCommit.sha || rawCommit.id || 'unknown-sha';
    const commitData = rawCommit.commit || {};
    const authorData = commitData.author || rawCommit.author || {};
    const message = commitData.message || rawCommit.message || 'No commit message';
    const timestamp = authorData.date || new Date().toISOString();

    const repoName = this.repo || 'repository';
    const repoOwner = this.owner || 'owner';
    const repoId = `${repoOwner}/${repoName}`;
    const repoUrl = `https://github.com/${repoId}`;

    const files = (rawDetails && rawDetails.files) ? rawDetails.files : (rawCommit.files || []);

    const changes = files.map(file => ({
      path: file.filename || file.path || 'unknown',
      status: this.mapFileStatus(file.status),
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      patch: file.patch || ''
    }));

    // Aggregate patch lines for AI LLM diff code review
    const rawDiff = changes.length > 0
      ? changes.map(c => `--- ${c.path}\n+++ ${c.path}\n${c.patch}`).join('\n\n')
      : (rawCommit.diff || 'diff --git a/src/app.js b/src/app.js\n+ updated code');

    return {
      provider: this.getName(),
      repository: {
        id: repoId,
        name: repoName,
        url: repoUrl
      },
      change: {
        id: sha,
        message,
        author: {
          name: authorData.name || 'GitHub Developer',
          email: authorData.email || ''
        },
        timestamp
      },
      changes,
      rawDiff
    };
  }

  mapFileStatus(status) {
    switch (status) {
      case 'added': return 'added';
      case 'removed':
      case 'deleted': return 'deleted';
      case 'renamed': return 'renamed';
      case 'modified':
      default: return 'modified';
    }
  }
}
