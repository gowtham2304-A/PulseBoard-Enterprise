import { GitHubProvider } from '../integrations/github/github.provider.js';
import { GitLabProvider } from '../integrations/gitlab/gitlab.provider.js';

const registry = {
  github: GitHubProvider,
  gitlab: GitLabProvider
};

/**
 * Registers a custom or new SourceControlProvider class.
 * @param {string} name
 * @param {typeof import('../integrations/base.provider.js').SourceControlProvider} ProviderClass
 */
export function registerProvider(name, ProviderClass) {
  registry[name.toLowerCase()] = ProviderClass;
}

/**
 * Creates and returns an instance of the configured SourceControlProvider.
 * @param {string} [providerName] - Name of provider (defaults to SOURCE_CONTROL_PROVIDER env or 'github')
 * @param {object} [options] - Optional custom credentials/repository parameters (overrides env)
 * @returns {import('../integrations/base.provider.js').SourceControlProvider}
 */
export function getSourceControlProvider(providerName = process.env.SOURCE_CONTROL_PROVIDER || 'github', options = {}) {
  const name = (providerName || 'github').toLowerCase();
  const ProviderClass = registry[name];

  if (!ProviderClass) {
    throw new Error(`[ProviderFactory] Unsupported source control provider: "${providerName}". Supported: ${Object.keys(registry).join(', ')}`);
  }

  if (name === 'github') {
    const owner = options.owner || process.env.GITHUB_OWNER;
    const repo = options.repo || process.env.GITHUB_REPO;
    const token = options.token || process.env.GITHUB_TOKEN;
    return new GitHubProvider(owner, repo, token);
  } else if (name === 'gitlab') {
    const projectId = options.projectId || process.env.GITLAB_PROJECT_ID;
    const token = options.token || process.env.GITLAB_TOKEN;
    const baseUrl = options.baseUrl || process.env.GITLAB_URL || 'https://gitlab.com';
    return new GitLabProvider(projectId, token, baseUrl);
  }

  return new ProviderClass();
}
