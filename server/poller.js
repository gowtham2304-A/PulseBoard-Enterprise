import { getSourceControlProvider } from './providers/factory.js';
import { pipeline } from './pipeline.js';
import { store } from './store.js';
import { decryptCredential } from './security/credential.vault.js';
import { connectionManager } from './connection-manager.js';

/**
 * Resolves the active SourceControlProvider instance.
 * Precedence: Saved connection (decrypted from MongoDB) > Environment variable fallback.
 */
export async function getActiveProviderInstance() {
  let rawConn = null;
  try {
    rawConn = await store.getConnectionWithCredential();
  } catch (err) {
    console.log('[Poller] Error reading saved connection from MongoDB, using environment fallback.');
  }

  if (rawConn && rawConn.status === 'connected' && rawConn.provider) {
    const providerName = (rawConn.provider || 'github').toLowerCase();
    console.log(`[Poller] Active connection loaded from MongoDB: Provider="${providerName}", Repository="${rawConn.repositoryId}"`);

    let token = null;
    if (rawConn.credential && rawConn.credential.encrypted) {
      try {
        token = decryptCredential(rawConn.credential);
      } catch (e) {
        console.error(`[Poller Error] Decryption failed for saved connection "${rawConn.id}": ${e.message}`);
      }
    }

    if (!token) {
      if (providerName === 'github') token = process.env.GITHUB_TOKEN;
      if (providerName === 'gitlab') token = process.env.GITLAB_TOKEN;
    }

    if (providerName === 'github') {
      const repositoryId = rawConn.repositoryId || '';
      const [owner, repo] = repositoryId.split('/');

      if (!token) {
        console.error(`[Poller Configuration Error] Saved connection is configured for GitHub repository "${repositoryId}", but no credential is saved in DB and GITHUB_TOKEN environment variable is missing.`);
        return null;
      }

      return getSourceControlProvider('github', { owner, repo, token });
    } else if (providerName === 'gitlab') {
      const projectId = rawConn.repositoryId || '';
      let baseUrl = process.env.GITLAB_URL || 'https://gitlab.com';
      if (rawConn.repositoryUrl) {
        const match = rawConn.repositoryUrl.match(/^(https?:\/\/[^\/]+)/i);
        if (match) baseUrl = match[1];
      }

      if (!token) {
        console.error(`[Poller Configuration Error] Saved connection is configured for GitLab project "${projectId}", but no credential is saved in DB and GITLAB_TOKEN environment variable is missing.`);
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
 * Polling Event Source runner. Periodically checks configured provider(s) for changes,
 * normalizes changes, and routes them to the PulseBoard processing pipeline.
 */
export async function startSourceControlPoller(providerOrName = null, intervalMs = 10000) {
  if (!providerOrName) {
    // Multi-connection manager runner mode
    return await connectionManager.loadAndStartAllConnections();
  }

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
      const preliminaryEvent = provider.normalizeChange(latestRawChange, null);

      if (!preliminaryEvent || !preliminaryEvent.change || !preliminaryEvent.change.id) return;

      const rawDetails = await provider.fetchChangeDetails(preliminaryEvent.change.id);
      const normalizedEvent = rawDetails
        ? provider.normalizeChange(latestRawChange, rawDetails)
        : preliminaryEvent;

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
