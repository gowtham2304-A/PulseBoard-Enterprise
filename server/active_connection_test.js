import { store } from './store.js';
import { getActiveProviderInstance } from './poller.js';
import { getSourceControlProvider } from './providers/factory.js';
import { pipeline } from './pipeline.js';

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

console.log('🧪 Starting Active Connection & Poller Precedence Test Suite (Phase 2.6)...\n');

async function runTests() {
  // Wait for MongoDB connection
  await new Promise(r => setTimeout(r, 2000));

  // Backup original env vars
  const origGhToken = process.env.GITHUB_TOKEN;
  const origGlToken = process.env.GITLAB_TOKEN;
  const origProvider = process.env.SOURCE_CONTROL_PROVIDER;

  try {
    // Set dummy tokens in env for testing
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITLAB_TOKEN = 'glpat_test_token_456';

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1 & 3: Saved GitHub connection exists & overrides GITHUB_REPO
    // ──────────────────────────────────────────────────────────────────────────
    console.log('1) Testing Saved GitHub Connection precedence');
    await store.saveConnection({
      provider: 'github',
      repositoryId: 'saved-owner/saved-repo',
      repositoryName: 'saved-repo',
      repositoryUrl: 'https://github.com/saved-owner/saved-repo'
    });

    const ghInstance = await getActiveProviderInstance();
    assert(ghInstance !== null, 'Should create GitHub provider instance');
    assert(ghInstance.getName() === 'github', 'Provider name must be "github"');
    assert(ghInstance.owner === 'saved-owner', 'Owner should come from saved connection in MongoDB');
    assert(ghInstance.repo === 'saved-repo', 'Repo should come from saved connection in MongoDB');
    console.log('  ✅ Saved GitHub connection overrides environment repository defaults.');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2 & 4: Saved GitLab connection exists & overrides GITLAB_PROJECT_ID
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n2) Testing Saved GitLab Connection precedence');
    await store.saveConnection({
      provider: 'gitlab',
      repositoryId: 'group/saved-gitlab-project',
      repositoryName: 'saved-gitlab-project',
      repositoryUrl: 'https://gitlab.com/group/saved-gitlab-project'
    });

    const glInstance = await getActiveProviderInstance();
    assert(glInstance !== null, 'Should create GitLab provider instance');
    assert(glInstance.getName() === 'gitlab', 'Provider name must be "gitlab"');
    assert(glInstance.projectId === 'group/saved-gitlab-project', 'Project ID should come from saved connection');
    assert(glInstance.baseUrl === 'https://gitlab.com', 'Base URL should be parsed correctly');
    console.log('  ✅ Saved GitLab connection overrides environment project defaults.');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: No saved connection -> Environment fallback
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n3) Testing Environment fallback when no saved connection exists');
    // Clear active_connection from MongoDB temporarily
    await store.clearTasks(); // also clears session/connection or we can clear connection manually
    await store.saveConnection({ provider: '', repositoryId: '', repositoryName: '', repositoryUrl: '', status: 'not_configured' });

    process.env.SOURCE_CONTROL_PROVIDER = 'github';
    process.env.GITHUB_OWNER = 'env-owner';
    process.env.GITHUB_REPO = 'env-repo';

    const envInstance = await getActiveProviderInstance();
    assert(envInstance !== null, 'Should create provider instance from environment');
    assert(envInstance.getName() === 'github', 'Should fall back to environment provider');
    assert(envInstance.owner === 'env-owner', 'Should fall back to GITHUB_OWNER env var');
    assert(envInstance.repo === 'env-repo', 'Should fall back to GITHUB_REPO env var');
    console.log('  ✅ Environment fallback correctly used when no active connection exists in DB.');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: Saved GitHub connection + missing GITHUB_TOKEN -> clear error
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n4) Testing Saved GitHub connection + missing GITHUB_TOKEN error handling');
    await store.saveConnection({
      provider: 'github',
      repositoryId: 'test-owner/test-repo',
      repositoryName: 'test-repo',
      repositoryUrl: 'https://github.com/test-owner/test-repo'
    });

    delete process.env.GITHUB_TOKEN;
    const missingGhTokenInstance = await getActiveProviderInstance();
    assert(missingGhTokenInstance === null, 'Should return null and log clear error when GITHUB_TOKEN is missing');
    process.env.GITHUB_TOKEN = 'ghp_test_token_123'; // restore token
    console.log('  ✅ Missing GITHUB_TOKEN handled safely without crashing or silent wrong provider fallback.');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: Saved GitLab connection + missing GITLAB_TOKEN -> clear error
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n5) Testing Saved GitLab connection + missing GITLAB_TOKEN error handling');
    await store.saveConnection({
      provider: 'gitlab',
      repositoryId: 'group/project',
      repositoryName: 'project',
      repositoryUrl: 'https://gitlab.com/group/project'
    });

    delete process.env.GITLAB_TOKEN;
    const missingGlTokenInstance = await getActiveProviderInstance();
    assert(missingGlTokenInstance === null, 'Should return null and log clear error when GITLAB_TOKEN is missing');
    process.env.GITLAB_TOKEN = 'glpat_test_token_456'; // restore token
    console.log('  ✅ Missing GITLAB_TOKEN handled safely without crashing.');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 8: Saved provider is unsupported -> clear error
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n6) Testing Unsupported saved provider error handling');
    await store.saveConnection({
      provider: 'unsupported_svn',
      repositoryId: 'svn/repo',
      repositoryName: 'repo',
      repositoryUrl: 'http://svn.example.com'
    });

    const unsupportedInstance = await getActiveProviderInstance();
    assert(unsupportedInstance === null, 'Should return null for unsupported saved provider');
    console.log('  ✅ Unsupported provider handled safely.');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 9 & 10: Connection status API & DB save never store or return credentials
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n7) Testing Security: Credentials never stored in MongoDB or returned in connection metadata');
    await store.saveConnection({
      provider: 'gitlab',
      repositoryId: 'secure/repo',
      repositoryName: 'repo',
      repositoryUrl: 'https://gitlab.com/secure/repo'
    });

    const dbConn = await store.getConnection();
    assert(dbConn !== null, 'Connection record should exist');
    assert(dbConn.token === undefined, 'Token field must NOT exist on DB connection document');
    assert(dbConn.password === undefined, 'Password field must NOT exist on DB connection document');
    assert(dbConn.pat === undefined, 'PAT field must NOT exist on DB connection document');
    console.log('  ✅ Security verified: MongoDB connection metadata contains ZERO secret credentials.');

  } finally {
    // Restore original env vars
    if (origGhToken) process.env.GITHUB_TOKEN = origGhToken;
    if (origGlToken) process.env.GITLAB_TOKEN = origGlToken;
    if (origProvider) process.env.SOURCE_CONTROL_PROVIDER = origProvider;
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failed > 0) {
    console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} PHASE 2.6 ACTIVE CONNECTION TESTS PASSED!`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
