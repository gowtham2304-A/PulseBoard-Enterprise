import { GitHubProvider } from '../integrations/github/github.provider.js';

const registry = {
  github: GitHubProvider
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
 * @returns {import('../integrations/base.provider.js').SourceControlProvider}
 */
export function getSourceControlProvider(providerName = process.env.SOURCE_CONTROL_PROVIDER || 'github') {
  const name = (providerName || 'github').toLowerCase();
  const ProviderClass = registry[name];

  if (!ProviderClass) {
    throw new Error(`[ProviderFactory] Unsupported source control provider: "${providerName}". Supported: ${Object.keys(registry).join(', ')}`);
  }

  return new ProviderClass();
}
