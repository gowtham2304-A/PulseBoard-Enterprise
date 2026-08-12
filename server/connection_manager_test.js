import { store } from './store.js';
import { connectionManager } from './connection-manager.js';
import { decryptCredential } from './security/credential.vault.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  } else {
    passed++;
  }
}

console.log('🧪 Starting Connection Manager & Multi-Connection Test Suite (Phase 2.8)...\n');

async function runTests() {
  process.env.NODE_ENV = 'test';
  // Set test encryption key in environment
  process.env.PULSEBOARD_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // Wait for MongoDB connection
  await new Promise(r => setTimeout(r, 2000));

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Register Connection & Encrypt Credential
    // ──────────────────────────────────────────────────────────────────────────
    console.log('1) Testing Connection Registration & Credential Encryption');
    const registerRes = await connectionManager.registerConnection(
      {
        provider: 'github',
        repository: {
          id: 'test-org/test-repo-1',
          name: 'test-repo-1',
          url: 'https://github.com/test-org/test-repo-1'
        }
      },
      'ghp_encrypted_secret_token_12345'
    );

    assert(registerRes.status === 'success', 'Registration must return status "success"');
    assert(registerRes.connection.id === 'github:test-org/test-repo-1', 'Connection ID must be provider:repositoryId');
    assert(registerRes.connection.hasCredential === true, 'Safe connection metadata must indicate hasCredential: true');
    assert(registerRes.connection.credential === undefined, 'Safe connection object MUST NOT contain credential object');

    // Internal check on DB document
    const dbConn = await store.getConnectionWithCredential('github:test-org/test-repo-1');
    assert(dbConn !== null, 'Connection record must exist in MongoDB');
    assert(dbConn.credential && dbConn.credential.encrypted, 'Encrypted credential object must exist in MongoDB');
    assert(!JSON.stringify(dbConn.credential).includes('ghp_encrypted_secret_token_12345'), 'Plaintext token MUST NOT exist in MongoDB document');

    const decryptedToken = decryptCredential(dbConn.credential);
    assert(decryptedToken === 'ghp_encrypted_secret_token_12345', 'Decrypted token must match original plaintext token');
    console.log('  ✅ Connection registration and credential encryption verified.');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Dynamic Activation & Poller Registration (No Server Restart)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n2) Testing Dynamic Poller Activation (No Server Restart)');
    assert(connectionManager.activePollers.has('github:test-org/test-repo-1'), 'Poller loop must be active immediately after save without server restart');
    console.log('  ✅ Dynamic poller activation verified.');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Duplicate Save Prevention
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n3) Testing Duplicate Connection Save (Prevents Duplicate Pollers)');
    const initialPollerCount = connectionManager.activePollers.size;
    await connectionManager.registerConnection(
      {
        provider: 'github',
        repository: {
          id: 'test-org/test-repo-1',
          name: 'test-repo-1',
          url: 'https://github.com/test-org/test-repo-1'
        }
      },
      'ghp_updated_secret_token_67890'
    );
    assert(connectionManager.activePollers.size === initialPollerCount, 'Duplicate connection save must replace existing poller rather than create duplicate pollers');
    console.log('  ✅ Duplicate poller creation prevented.');

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Simultaneous Multi-Connection Support (GitHub + GitLab)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n4) Testing Simultaneous Multi-Connection Architecture (GitHub + GitLab)');
    await connectionManager.registerConnection(
      {
        provider: 'gitlab',
        repository: {
          id: 'gitlab-group/backend-service',
          name: 'backend-service',
          url: 'https://gitlab.com/gitlab-group/backend-service'
        }
      },
      'glpat-simultaneous_gitlab_token_999'
    );

    assert(connectionManager.activePollers.has('github:test-org/test-repo-1'), 'GitHub poller must remain active');
    assert(connectionManager.activePollers.has('gitlab:gitlab-group/backend-service'), 'GitLab poller must be active simultaneously');
    assert(connectionManager.activePollers.size >= 2, 'Must support multiple simultaneous active connections');

    const statusList = await connectionManager.getStatusList();
    assert(statusList.length >= 2, 'Status list must return safe metadata for all active connections');
    assert(statusList.every(c => c.credential === undefined), 'All connection status objects MUST NOT contain credential fields');
    console.log('  ✅ Simultaneous GitHub and GitLab connection polling verified.');

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Credential Rotation / Update
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n5) Testing Credential Rotation / Replacement');
    await connectionManager.registerConnection(
      {
        provider: 'github',
        repository: {
          id: 'test-org/test-repo-1',
          name: 'test-repo-1',
          url: 'https://github.com/test-org/test-repo-1'
        }
      },
      'ghp_rotated_token_55555'
    );

    const rotatedDbConn = await store.getConnectionWithCredential('github:test-org/test-repo-1');
    const decryptedRotated = decryptCredential(rotatedDbConn.credential);
    assert(decryptedRotated === 'ghp_rotated_token_55555', 'Credential rotation must update stored encrypted payload');
    console.log('  ✅ Credential rotation verified.');

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Safe Disconnect Connection
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n6) Testing Safe Disconnect Connection');
    const disconnectRes = await connectionManager.disconnectConnection('github:test-org/test-repo-1');
    assert(disconnectRes.success === true, 'Disconnect must return success');
    assert(!connectionManager.activePollers.has('github:test-org/test-repo-1'), 'Poller must be stopped upon disconnect');

    const deletedCheck = await store.getConnection('github:test-org/test-repo-1');
    assert(deletedCheck === null, 'Connection document must be deleted from MongoDB upon disconnect');
    console.log('  ✅ Disconnect connection verified.');

    // Clean up remaining test connection
    await connectionManager.disconnectConnection('gitlab:gitlab-group/backend-service');

  } catch (err) {
    console.error('❌ Test execution error:', err);
    failed++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failed > 0) {
    console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} CONNECTION MANAGER TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Execution error:', err);
  process.exit(1);
});
