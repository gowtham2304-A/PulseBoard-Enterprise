/**
 * GitHubClient - Encapsulates direct REST API HTTP calls to GitHub.
 * Keeps raw API networking isolated from provider logic.
 */
export class GitHubClient {
  constructor(owner, repo, token) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  isConfigured() {
    return Boolean(this.owner && this.repo && this.token);
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'PulseBoard-Autonomous-Agent'
    };
  }

  /**
   * Fetches latest commits list from GitHub repository.
   */
  async getLatestCommits(limit = 10) {
    if (!this.isConfigured()) return [];
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits?per_page=${limit}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      console.error(`[GitHubClient] Failed to fetch commits (${res.status} ${res.statusText})`);
      return [];
    }
    return await res.json();
  }

  /**
   * Fetches full single commit details including modified files and diff patches.
   */
  async getCommitDetail(sha) {
    if (!this.isConfigured() || !sha) return null;
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits/${sha}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      console.error(`[GitHubClient] Failed to fetch commit detail for SHA ${sha} (${res.status})`);
      return null;
    }
    return await res.json();
  }
}
