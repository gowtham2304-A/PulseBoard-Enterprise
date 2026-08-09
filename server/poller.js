import { getSourceControlProvider } from './providers/factory.js';
import { pipeline } from './pipeline.js';

/**
 * Polling Event Source runner. Periodically checks configured provider for changes,
 * normalizes changes, and routes them to the PulseBoard processing pipeline.
 */
export function startSourceControlPoller(providerName = process.env.SOURCE_CONTROL_PROVIDER || 'github', intervalMs = 10000) {
  let provider;
  try {
    provider = getSourceControlProvider(providerName);
  } catch (err) {
    console.log(`[Poller] Provider error: ${err.message}`);
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
