import { GitHubProvider } from './integrations/github/github.provider.js';
import { getSourceControlProvider, registerProvider } from './providers/factory.js';
import { GeminiAnalyzer } from './analyzer/gemini.analyzer.js';
import { SourceControlProvider } from './integrations/base.provider.js';
import { store } from './store.js';

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

console.log('🧪 Starting Source Control Provider Abstraction Test Suite...\n');

// ──────────────────────────────────────────────────────────────────────────────
// Test 1: GitHubProvider Normalization
// ──────────────────────────────────────────────────────────────────────────────
console.log('1) Testing GitHubProvider.normalizeChange()');
const ghProvider = new GitHubProvider('test-owner', 'test-repo', 'dummy-token');

const mockRawCommit = {
  sha: 'abc123456789def',
  commit: {
    message: 'feat: add authentication login validation',
    author: {
      name: 'Alice Developer',
      email: 'alice@example.com',
      date: '2026-08-10T00:00:00Z'
    }
  }
};

const mockRawDetails = {
  files: [
    {
      filename: 'src/auth/login.js',
      status: 'modified',
      additions: 15,
      deletions: 2,
      patch: '@@ -1,5 +1,18 @@\n+export function validateLogin(user, pass) { return true; }'
    },
    {
      filename: 'src/auth/login.test.js',
      status: 'added',
      additions: 20,
      deletions: 0,
      patch: '@@ -0,0 +1,20 @@\n+test("login validation", () => {});'
    }
  ]
};

const normalized = ghProvider.normalizeChange(mockRawCommit, mockRawDetails);

assert(normalized.provider === 'github', 'Provider should be "github"');
assert(normalized.repository.id === 'test-owner/test-repo', 'Repo ID should match owner/repo');
assert(normalized.repository.name === 'test-repo', 'Repo name should match');
assert(normalized.change.id === 'abc123456789def', 'Change ID should match SHA');
assert(normalized.change.author.name === 'Alice Developer', 'Author name should match');
assert(normalized.change.author.email === 'alice@example.com', 'Author email should match');
assert(normalized.change.message === 'feat: add authentication login validation', 'Message should match');
assert(normalized.change.timestamp === '2026-08-10T00:00:00Z', 'Timestamp should match');
assert(normalized.changes.length === 2, 'Should normalize 2 changed files');
assert(normalized.changes[0].path === 'src/auth/login.js', 'File 1 path should match');
assert(normalized.changes[0].status === 'modified', 'File 1 status should be modified');
assert(normalized.changes[0].additions === 15, 'File 1 additions should be 15');
assert(normalized.changes[0].deletions === 2, 'File 1 deletions should be 2');
assert(normalized.changes[1].status === 'added', 'File 2 status should be added');
assert(typeof normalized.rawDiff === 'string' && normalized.rawDiff.length > 0, 'rawDiff should be populated');
console.log('  ✅ GitHub response correctly normalized into NormalizedChangeEvent schema.');

// ──────────────────────────────────────────────────────────────────────────────
// Test 2: Normalization WITHOUT details (preliminary normalization for poller)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n2) Testing GitHubProvider.normalizeChange() without details (preliminary)');
const prelimEvent = ghProvider.normalizeChange(mockRawCommit, null);
assert(prelimEvent.change.id === 'abc123456789def', 'Should extract change ID without details');
assert(prelimEvent.changes.length === 0, 'Changes list should be empty without details');
assert(prelimEvent.provider === 'github', 'Provider should still be github');
console.log('  ✅ Preliminary normalization works for poller flow.');

// ──────────────────────────────────────────────────────────────────────────────
// Test 3: Provider Factory Selection & Registration
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n3) Testing Provider Factory & Selection');
const defaultProvider = getSourceControlProvider('github');
assert(defaultProvider.getName() === 'github', 'Default provider should be github');

class MockGitLabProvider extends SourceControlProvider {
  getName() { return 'gitlab'; }
  async fetchChanges() { return []; }
  async fetchChangeDetails() { return {}; }
  normalizeChange() { return {}; }
}
registerProvider('gitlab', MockGitLabProvider);
const gitlabProvider = getSourceControlProvider('gitlab');
assert(gitlabProvider.getName() === 'gitlab', 'Factory should return registered MockGitLabProvider');

let factoryErrorThrown = false;
try { getSourceControlProvider('nonexistent'); } catch (e) { factoryErrorThrown = true; }
assert(factoryErrorThrown, 'Factory should throw for unsupported provider');
console.log('  ✅ Factory correctly instantiates configured & registered providers.');

// ──────────────────────────────────────────────────────────────────────────────
// Test 4: GeminiAnalyzer consuming NormalizedChangeEvent
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n4) Testing GeminiAnalyzer consuming NormalizedChangeEvent');
const analyzer = new GeminiAnalyzer();
const mockTasks = [
  { id: 'task-101', title: 'Implement user login authentication validation', description: 'Add validateLogin helper function in auth module', status: 'todo', assignee: 'Alice' }
];

async function testAnalyzer() {
  const result = await analyzer.analyzeChangeEvent(normalized, mockTasks);
  assert(result.matchedTaskId === 'task-101', 'Should match task-101 based on auth tokens');
  assert(['in_progress', 'review', 'done'].includes(result.newStatus), 'Should assign valid status');
  assert(typeof result.summary === 'string' && result.summary.length > 0, 'Summary should be non-empty string');
  assert(typeof result.confidence === 'string', 'Confidence should be string');
  console.log(`  ✅ Analyzer returned matchedTaskId="${result.matchedTaskId}", newStatus="${result.newStatus}"`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 5: Edge Cases (Missing patch, empty file list, deleted files)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n5) Testing Edge Cases');
const mockCommitNoPatch = {
  sha: 'xyz987654321',
  commit: {
    message: 'docs: update readme',
    author: { name: 'Bob' }
  }
};
const normalizedNoPatch = ghProvider.normalizeChange(mockCommitNoPatch, { files: [] });
assert(normalizedNoPatch.change.id === 'xyz987654321', 'Should handle change without files');
assert(normalizedNoPatch.changes.length === 0, 'Changes list should be empty');

const mockDeleted = {
  sha: 'del999',
  commit: { message: 'rm old file', author: { name: 'Carol' } }
};
const normalizedDel = ghProvider.normalizeChange(mockDeleted, {
  files: [{ filename: 'old.js', status: 'removed', additions: 0, deletions: 50, patch: '' }]
});
assert(normalizedDel.changes[0].status === 'deleted', 'GitHub "removed" should map to "deleted"');
console.log('  ✅ Edge cases handled gracefully.');

// ──────────────────────────────────────────────────────────────────────────────
// Test 6: scoreTaskPriority works (Fix 1 verification)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n6) Testing scoreTaskPriority (Fix 1 verification)');
async function testScoreTaskPriority() {
  // Import from the re-exporting analyzer.js (same path server.js uses)
  const { scoreTaskPriority } = await import('./analyzer.js');
  const priority = await scoreTaskPriority('Fix login security bug', 'Critical auth bypass', [], null);
  assert(['high', 'medium', 'low'].includes(priority), `scoreTaskPriority should return valid priority, got: "${priority}"`);
  console.log(`  ✅ scoreTaskPriority returned "${priority}" without crashing.`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 7: Idempotency — provider + repositoryId scoping (Fix 5 verification)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n7) Testing Idempotency Scoping (Fix 5)');
async function testIdempotency() {
  // same provider + same repo + same changeId → duplicate
  const check1a = await store.hasProcessedChange('testuniq999', 'github', 'owner/repo');
  assert(check1a === false, 'Should not find non-existent change');

  await store.addActivityLog({
    id: `idem-test-${Date.now()}`,
    provider: 'github',
    repositoryId: 'owner/repo',
    repositoryName: 'repo',
    changeId: 'testuniq999',
    sha: 'testuniq999',
    author: 'Test',
    message: 'test',
    matchedTask: 'Test task',
    matchedTaskId: null,
    statusShift: 'none',
    summary: 'Idempotency test',
    confidence: 'low',
    timestamp: new Date().toISOString()
  });

  const check1b = await store.hasProcessedChange('testuniq999', 'github', 'owner/repo');
  assert(check1b === true, 'Same provider + same repo + same changeId → duplicate');

  // different provider + same changeId → NOT duplicate
  const check2 = await store.hasProcessedChange('testuniq999', 'gitlab', 'company/project');
  assert(check2 === false, 'Different provider + same changeId → NOT duplicate');

  // same provider + different repo + same changeId → NOT duplicate
  const check3 = await store.hasProcessedChange('testuniq999', 'github', 'other-owner/other-repo');
  assert(check3 === false, 'Same provider + different repo + same changeId → NOT duplicate');

  // Legacy fallback (no provider/repo) → finds by changeId alone
  const check4 = await store.hasProcessedChange('testuniq999');
  assert(check4 === true, 'Legacy fallback should find by changeId alone');

  console.log('  ✅ Idempotency correctly scoped by provider + repositoryId + changeId.');
}

// ──────────────────────────────────────────────────────────────────────────────
// Run all async tests
// ──────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await testAnalyzer();
  await testScoreTaskPriority();

  // Wait for MongoDB connection before idempotency tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testIdempotency();

  console.log(`\n${'─'.repeat(60)}`);
  if (failed > 0) {
    console.log(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} TESTS PASSED — SOURCE CONTROL ABSTRACTION VERIFIED!`);
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
