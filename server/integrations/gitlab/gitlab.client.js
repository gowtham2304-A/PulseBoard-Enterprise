/**
 * GitLabClient - Encapsulates direct REST API HTTP calls to GitLab v4 API.
 * Keeps raw API networking isolated from provider & pipeline logic.
 */
export class GitLabClient {
  constructor(projectId, token, baseUrl = 'https://gitlab.com') {
    this.projectId = projectId;
    this.token = token;
    this.baseUrl = (baseUrl || 'https://gitlab.com').replace(/\/+$/, '');
  }

  isConfigured() {
    return Boolean(this.projectId && this.token);
  }

  getHeaders() {
    return {
      'PRIVATE-TOKEN': this.token,
      'Accept': 'application/json',
      'User-Agent': 'PulseBoard-Autonomous-Agent'
    };
  }

  /**
   * Fetches latest commits list from GitLab repository.
   * GET /api/v4/projects/:id/repository/commits
   */
  async getLatestCommits(limit = 10) {
    if (!this.isConfigured()) return [];
    const encodedId = encodeURIComponent(this.projectId);
    const url = `${this.baseUrl}/api/v4/projects/${encodedId}/repository/commits?per_page=${limit}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      console.error(`[GitLabClient] Failed to fetch commits (${res.status} ${res.statusText})`);
      return [];
    }
    return await res.json();
  }

  /**
   * Fetches full single commit details from GitLab.
   * GET /api/v4/projects/:id/repository/commits/:sha
   */
  async getCommitDetail(sha) {
    if (!this.isConfigured() || !sha) return null;
    const encodedId = encodeURIComponent(this.projectId);
    const encodedSha = encodeURIComponent(sha);
    const url = `${this.baseUrl}/api/v4/projects/${encodedId}/repository/commits/${encodedSha}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      console.error(`[GitLabClient] Failed to fetch commit detail for SHA ${sha} (${res.status})`);
      return null;
    }
    return await res.json();
  }

  /**
   * Fetches diff information for a single commit.
   * GET /api/v4/projects/:id/repository/commits/:sha/diff
   */
  async getCommitDiff(sha) {
    if (!this.isConfigured() || !sha) return [];
    const encodedId = encodeURIComponent(this.projectId);
    const encodedSha = encodeURIComponent(sha);
    const url = `${this.baseUrl}/api/v4/projects/${encodedId}/repository/commits/${encodedSha}/diff`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      console.error(`[GitLabClient] Failed to fetch commit diff for SHA ${sha} (${res.status})`);
      return [];
    }
    return await res.json();
  }

  /**
   * Fetches project metadata (web_url, path_with_namespace, name).
   * GET /api/v4/projects/:id
   */
  async getProjectInfo() {
    if (!this.isConfigured()) return null;
    const encodedId = encodeURIComponent(this.projectId);
    const url = `${this.baseUrl}/api/v4/projects/${encodedId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) return null;
    return await res.json();
  }
}
