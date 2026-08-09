/**
 * SourceControlProvider - Abstract Base Class for all source control integrations.
 * Represents what PulseBoard needs from any repository server (GitHub, GitLab, Bitbucket, Azure, Gerrit, Agent, etc.).
 */
export class SourceControlProvider {
  /**
   * Unique string identifier for this provider (e.g. 'github', 'gitlab', 'gerrit')
   * @returns {string}
   */
  getName() {
    throw new Error('Method getName() must be implemented by subclass');
  }

  /**
   * Fetches latest changes/commits from the source control server.
   * @returns {Promise<Array<any>>} Array of raw provider change items
   */
  async fetchChanges() {
    throw new Error('Method fetchChanges() must be implemented by subclass');
  }

  /**
   * Fetches detailed information (files, line stats, diff patches) for a specific change identifier.
   * @param {string} changeId - Provider-specific change/commit identifier
   * @returns {Promise<any>} Raw detail object from provider
   */
  async fetchChangeDetails(changeId) {
    throw new Error('Method fetchChangeDetails(changeId) must be implemented by subclass');
  }

  /**
   * Transforms raw provider-specific response payloads into a strict NormalizedChangeEvent.
   * @param {any} rawChange - Main change record from fetchChanges()
   * @param {any} rawDetails - Detailed record from fetchChangeDetails()
   * @returns {import('../pipeline.js').NormalizedChangeEvent}
   */
  normalizeChange(rawChange, rawDetails) {
    throw new Error('Method normalizeChange(rawChange, rawDetails) must be implemented by subclass');
  }
}
