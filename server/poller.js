import { getSourceControlProvider } from './providers/factory.js';
import { pipeline } from './pipeline.js';
import { store } from './store.js';

/**
 * Resolves the active SourceControlProvider instance.
 * Precedence: Saved active connection in MongoDB > Environment variable fallback.
 */
export async function getActiveProviderInstance() {
  let savedConn = null;
  try {
    savedConn = await store.getConnection();
  } catch (err) {
    console.log('[Poller] Error reading saved connection from MongoDB, using environment fallback.');
  }

  if (savedConn && savedConn.status === 'connected' && savedConn.provider) {
    const providerName = savedConn.provider.toLowerCase();
    console.log(`[Poller] Active connection loaded from MongoDB: Provider="${providerName}", Repository="${savedConn.repositoryId}"`);

    if (providerName === 'github') {
      const repositoryId = savedConn.repositoryId || '';
      const [owner, repo] = repositoryId.split('/');
      const token = process.env.GITHUB_TOKEN;

      if (!token) {
        console.error(`[Poller Configuration Error] Saved connection is configured for GitHub repository "${repositoryId}", but GITHUB_TOKEN environment variable is missing.`);
        return null;
      }

      return getSourceControlProvider('github', { owner, repo, token });
    } else if (providerName === 'gitlab') {
      const projectId = savedConn.repositoryId || '';
      const token = process.env.GITLAB_TOKEN;
      let baseUrl = process.env.GITLAB_URL || 'https://gitlab.com';
      if (savedConn.repositoryUrl) {
        const urlParts = savedConn.repositoryUrl.replace(/\/+$/, '').split('/-/');
        if (urlParts.length > 0) {
          const match = urlParts[0].match(/^(https?:\/\/[^\/]+)/i);
          if (match) baseUrl = match[1];
        }
      }

      if (!token) {
        console.error(`[Poller Configuration Error] Saved connection is configured for GitLab project "${projectId}", but GITLAB_TOKEN environment variable is missing.`);
        return null;
      }

      return getSourceControlProvider('gitlab', { projectId, token, baseUrl });
    } else {
      console.error(`[Poller Configuration Error] Unsupported saved provider: "${providerName}".`);
      return null;
    }
  }

  // Fallback to environment variables when no saved connection exists in MongoDB
  const envProvider = (process.env.SOURCE_CONTROL_PROVIDER || 'github').toLowerCase();
  console.log(`[Poller] No active saved connection in MongoDB. Using environment fallback: Provider="${envProvider}"`);

  return getSourceControlProvider(envProvider);
}

/**
 * Polling Event Source runner. Periodically checks configured provider for changes,
 * normalizes changes, and routes them to the PulseBoard processing pipeline.
 */
export async function startSourceControlPoller(providerOrName = null, intervalMs = 10000) {
  let provider;

  if (typeof providerOrName === 'object' && providerOrName !== null) {
    provider = providerOrName;
  } else if (typeof providerOrName === 'string') {
    try {
      provider = getSourceControlProvider(providerOrName);
    } catch (err) {
      console.log(`[Poller] Provider error: ${err.message}`);
      return;
    }
  } else {
    provider = await getActiveProviderInstance();
  }

  if (!provider) {
    console.log('[Poller] Could not initialize provider instance. Poller stopped.');
    return;
  }

  if (typeof provider.isConfigured === 'function' && !provider.isConfigured()) {
    console.log(`[Poller] Provider (${provider.getName()}) missing token/credentials. Running in manual simulation mode.`);
    return;
  }

  console.log(`[Poller] Started watching source control server via provider: "${provider.getName()}" (Interval: ${intervalMs}ms)`);

  setInterval(async () => {
    try {
      const changes = await provider.fetchChanges();
      if (!Array.isArray(changes) || changes.length === 0) return;

      const latestRawChange = changes[0];

      // Normalize first to get a provider-neutral change ID, then fetch details
      const preliminaryEvent = provider.normalizeChange(latestRawChange, null);
      if (!preliminaryEvent || !preliminaryEvent.change || !preliminaryEvent.change.id) return;

      // Fetch full detail diffs using the provider-extracted change ID
      const rawDetails = await provider.fetchChangeDetails(preliminaryEvent.change.id);

      // Re-normalize with full details for complete patch data
      const normalizedEvent = rawDetails
        ? provider.normalizeChange(latestRawChange, rawDetails)
        : preliminaryEvent;

      // Route event to central pipeline
      await pipeline.processChangeEvent(normalizedEvent);
    } catch (err) {
      console.error('[Poller Error]:', err.message);
    }
  }, intervalMs);
}

/**
 * Backward compatibility alias for startGitHubPoller
 */
export function startGitHubPoller(owner, repo, token, apiKey, intervalMs = 10000) {
  return startSourceControlPoller('github', intervalMs);
}
