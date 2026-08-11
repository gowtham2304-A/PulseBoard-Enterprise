import { store } from './store.js';
import { encryptCredential, decryptCredential } from './security/credential.vault.js';
import { getSourceControlProvider } from './providers/factory.js';
import { pipeline } from './pipeline.js';

class ConnectionManager {
  constructor() {
    /** @type {Map<string, { timer: NodeJS.Timeout, provider: any, connection: any }>} */
    this.activePollers = new Map();
    this.pollIntervalMs = 10000;
  }

  /**
   * Initializes and starts monitoring for all active connections saved in MongoDB.
   * Falls back to process.env configuration if no connection with credentials exists in DB.
   */
  async loadAndStartAllConnections() {
    console.log('[ConnectionManager] Loading active connections from database...');
    let connections = await store.getConnections();

    // Migration / Fallback: If no connections in DB, check if legacy connection or env variables exist
    if (connections.length === 0) {
      const legacyConn = await store.getConnection();
      if (legacyConn && legacyConn.repositoryId) {
        connections = [legacyConn];
      }
    }

    let startedCount = 0;

    for (const connMetadata of connections) {
      const started = await this.startConnectionMonitoring(connMetadata.id);
      if (started) startedCount++;
    }

    // Fallback mode if zero DB connections could be started
    if (startedCount === 0) {
      const envProvider = (process.env.SOURCE_CONTROL_PROVIDER || 'github').toLowerCase();
      console.log(`[ConnectionManager] No active DB connections started. Attempting environment fallback for provider="${envProvider}"...`);
      try {
        const providerInstance = getSourceControlProvider(envProvider);
        if (providerInstance && typeof providerInstance.isConfigured === 'function' && providerInstance.isConfigured()) {
          const fallbackConnId = `env:${envProvider}`;
          this.startPollerLoop(fallbackConnId, providerInstance, {
            id: fallbackConnId,
            provider: envProvider,
            repositoryId: 'env_configured',
            status: 'connected'
          });
          console.log(`[ConnectionManager] Environment fallback poller started for provider="${envProvider}".`);
        } else {
          console.log('[ConnectionManager] Environment fallback provider is unconfigured or missing tokens.');
        }
      } catch (err) {
        console.error(`[ConnectionManager Error] Environment fallback failed: ${err.message}`);
      }
    } else {
      console.log(`[ConnectionManager] Successfully started ${startedCount} connection poller(s).`);
    }
  }

  /**
   * Instantiates provider with decrypted credential and starts monitoring for a specific connection ID.
   * @param {string} connectionId
   * @returns {Promise<boolean>}
   */
  async startConnectionMonitoring(connectionId) {
    const rawConn = await store.getConnectionWithCredential(connectionId);
    if (!rawConn) {
      console.log(`[ConnectionManager] Connection ID "${connectionId}" not found in database.`);
      return false;
    }

    const connId = rawConn.id || `${rawConn.provider}:${rawConn.repositoryId}`;
    const providerName = (rawConn.provider || 'github').toLowerCase();

    // Stop existing poller if running for this ID
    this.stopConnectionMonitoring(connId);

    let providerToken = null;

    if (rawConn.credential && rawConn.credential.encrypted) {
      try {
        providerToken = decryptCredential(rawConn.credential);
      } catch (err) {
        console.error(`[ConnectionManager Error] Failed to decrypt credential for connection "${connId}": ${err.message}`);
        await store.saveConnection({
          id: connId,
          provider: providerName,
          repositoryId: rawConn.repositoryId,
          status: 'authentication_error'
        });
        return false;
      }
    }

    // Fallback to env token if DB connection has no credential
    if (!providerToken) {
      if (providerName === 'github' && process.env.GITHUB_TOKEN) {
        providerToken = process.env.GITHUB_TOKEN;
      } else if (providerName === 'gitlab' && process.env.GITLAB_TOKEN) {
        providerToken = process.env.GITLAB_TOKEN;
      }
    }

    if (!providerToken) {
      console.warn(`[ConnectionManager Warning] Connection "${connId}" has no saved encrypted credential and no fallback env token. Marking as "credential_required".`);
      await store.saveConnection({
        id: connId,
        provider: providerName,
        repositoryId: rawConn.repositoryId,
        repositoryName: rawConn.repositoryName,
        repositoryUrl: rawConn.repositoryUrl,
        status: 'credential_required'
      });
      return false;
    }

    // Build provider options
    let providerOptions = {};
    if (providerName === 'github') {
      const repoId = rawConn.repositoryId || '';
      const [owner, repo] = repoId.split('/');
      providerOptions = { owner, repo, token: providerToken };
    } else if (providerName === 'gitlab') {
      const projectId = rawConn.repositoryId || '';
      let baseUrl = process.env.GITLAB_URL || 'https://gitlab.com';
      if (rawConn.repositoryUrl) {
        const match = rawConn.repositoryUrl.match(/^(https?:\/\/[^\/]+)/i);
        if (match) baseUrl = match[1];
      }
      providerOptions = { projectId, token: providerToken, baseUrl };
    }

    let providerInstance;
    try {
      providerInstance = getSourceControlProvider(providerName, providerOptions);
    } catch (err) {
      console.error(`[ConnectionManager Error] Failed to create provider instance for connection "${connId}": ${err.message}`);
      return false;
    }

    if (typeof providerInstance.isConfigured === 'function' && !providerInstance.isConfigured()) {
      console.warn(`[ConnectionManager Warning] Provider instance for connection "${connId}" is not fully configured.`);
      return false;
    }

    // Save status as connected
    await store.saveConnection({
      id: connId,
      provider: providerName,
      repositoryId: rawConn.repositoryId,
      repositoryName: rawConn.repositoryName,
      repositoryUrl: rawConn.repositoryUrl,
      status: 'connected'
    });

    this.startPollerLoop(connId, providerInstance, rawConn);
    console.log(`[ConnectionManager] Monitoring started for connection "${connId}" (Provider: ${providerName}, Repo: ${rawConn.repositoryId}).`);
    return true;
  }

  /**
   * Internal method to run polling loop for a specific connection.
   */
  startPollerLoop(connId, providerInstance, safeMeta) {
    this.stopConnectionMonitoring(connId);

    const timer = setInterval(async () => {
      try {
        const changes = await providerInstance.fetchChanges();
        if (!Array.isArray(changes) || changes.length === 0) return;

        const latestRawChange = changes[0];
        const preliminaryEvent = providerInstance.normalizeChange(latestRawChange, null);

        if (!preliminaryEvent || !preliminaryEvent.change || !preliminaryEvent.change.id) return;

        const rawDetails = await providerInstance.fetchChangeDetails(preliminaryEvent.change.id);
        const normalizedEvent = rawDetails
          ? providerInstance.normalizeChange(latestRawChange, rawDetails)
          : preliminaryEvent;

        // Route to pipeline
        await pipeline.processChangeEvent(normalizedEvent);
      } catch (err) {
        console.error(`[Poller Error] Connection "${connId}": ${err.message}`);
        // If authentication error (e.g. 401 / 403 / Invalid token), mark status without crashing other pollers
        if (err.message.includes('401') || err.message.includes('403') || err.message.includes('authenticate')) {
          store.saveConnection({
            id: connId,
            provider: safeMeta.provider,
            repositoryId: safeMeta.repositoryId,
            status: 'authentication_error'
          }).catch(() => {});
        }
      }
    }, this.pollIntervalMs);

    this.activePollers.set(connId, {
      timer,
      provider: providerInstance,
      connection: safeMeta
    });
  }

  /**
   * Stops polling monitoring for a specific connection ID.
   * @param {string} connId
   */
  stopConnectionMonitoring(connId) {
    if (this.activePollers.has(connId)) {
      const poller = this.activePollers.get(connId);
      if (poller && poller.timer) {
        clearInterval(poller.timer);
      }
      this.activePollers.delete(connId);
      console.log(`[ConnectionManager] Monitoring stopped for connection "${connId}".`);
    }
  }

  /**
   * Registers a connection, encrypts credential, persists it, and dynamically starts monitoring without server restart.
   * @param {object} connData - { provider, repository: { id, name, url } }
   * @param {string} [plaintextCredential] - Optional raw PAT / token
   * @returns {Promise<{ status: string, connection: any }>}
   */
  async registerConnection(connData, plaintextCredential = null) {
    const provider = (connData.provider || 'github').toLowerCase();
    const repo = connData.repository || {};
    const repositoryId = repo.id || connData.repositoryId;

    if (!provider || !repositoryId) {
      throw new Error('Provider and repository ID are required.');
    }

    const connId = connData.id || `${provider}:${repositoryId}`;

    let encryptedObj = null;
    if (plaintextCredential && typeof plaintextCredential === 'string' && plaintextCredential.trim()) {
      encryptedObj = encryptCredential(plaintextCredential.trim());
    }

    const saved = await store.saveConnection({
      id: connId,
      provider,
      repositoryId,
      repositoryName: repo.name || connData.repositoryName || repositoryId,
      repositoryUrl: repo.url || connData.repositoryUrl || '',
      status: 'connected',
      credential: encryptedObj
    });

    // Dynamically activate monitoring immediately (No server restart required!)
    await this.startConnectionMonitoring(connId);

    return {
      status: 'success',
      connection: saved
    };
  }

  /**
   * Safely disconnects a connection, stopping monitoring and deleting the credential from MongoDB.
   * @param {string} connectionId
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async disconnectConnection(connectionId) {
    this.stopConnectionMonitoring(connectionId);
    const deleted = await store.deleteConnection(connectionId);
    return {
      success: deleted,
      message: deleted ? `Connection "${connectionId}" disconnected and credentials removed.` : `Connection "${connectionId}" not found.`
    };
  }

  /**
   * Returns safe status list of all configured active connections.
   * @returns {Promise<Array<any>>}
   */
  async getStatusList() {
    return await store.getConnections();
  }
}

export const connectionManager = new ConnectionManager();
