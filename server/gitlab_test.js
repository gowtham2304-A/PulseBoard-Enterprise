import { GitLabClient } from './integrations/gitlab/gitlab.client.js';
import { GitLabProvider } from './integrations/gitlab/gitlab.provider.js';
import { getSourceControlProvider } from './providers/factory.js';
import { pipeline } from './pipeline.js';
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

console.log('🧪 Starting GitLab Provider Unit & Integration Test Suite...\n');

// ──────────────────────────────────────────────────────────────────────────────
// 1. GitLabClient authentication headers
// ──────────────────────────────────────────────────────────────────────────────
console.log('1) Testing GitLabClient headers & authentication configuration');
const client = new GitLabClient('group/my-project', 'glpat-dummytoken123', 'https://gitlab.example.com');
assert(client.isConfigured() === true, 'Client should be configured when projectId & token are set');

const headers = client.getHeaders();
assert(headers['PRIVATE-TOKEN'] === 'glpat-dummytoken123', 'Header must contain PRIVATE-TOKEN');
assert(client.baseUrl === 'https://gitlab.example.com', 'Base URL should strip trailing slashes');
console.log('  ✅ GitLabClient headers & auth configuration verified.');

// ──────────────────────────────────────────────────────────────────────────────
// 2. Fetch recent commits (Mocked network test)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n2) Testing GitLabClient fetch methods interface');
assert(typeof client.getLatestCommits === 'function', 'getLatestCommits must exist');
assert(typeof client.getCommitDetail === 'function', 'getCommitDetail must exist');
assert(typeof client.getCommitDiff === 'function', 'getCommitDiff must exist');
assert(typeof client.getProjectInfo === 'function', 'getProjectInfo must exist');
console.log('  ✅ Client API methods verified.');

// ──────────────────────────────────────────────────────────────────────────────
// 3. Normalization tests (Author, Message, Change ID, Repository Metadata)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n3) Testing GitLabProvider.normalizeChange() contract compliance');
const gitlabProvider = new GitLabProvider('group/my-project', 'glpat-token', 'https://gitlab.com');

const mockSha = 'gl' + Math.random().toString(16).substring(2, 12);
const mockGitLabCommit = {
  id: mockSha,
  short_id: mockSha.substring(0, 7),
  title: 'feat(auth): implement OAuth2 token refresher',
  message: 'feat(auth): implement OAuth2 token refresher\n\nDetailed commit message body.',
  author_name: 'Jane GitLab Dev',
  author_email: 'jane@gitlab.com',
  authored_date: '2026-08-10T01:00:00.000Z',
  committed_date: '2026-08-10T01:00:00.000Z',
  web_url: 'https://gitlab.com/group/my-project/-/commit/a9b8c7d6e5f43210123456789abcdef012345678',
  project_id: 98765
};

const mockGitLabDiffs = [
  {
    old_path: 'src/auth/oauth.js',
    new_path: 'src/auth/oauth.js',
    new_file: false,
    renamed_file: false,
    deleted_file: false,
    diff: '@@ -1,3 +1,15 @@\n+export function refreshOAuthToken() {\n+  return fetch("/oauth/token");\n+}'
  },
  {
    old_path: '',
    new_path: 'src/auth/oauth.test.js',
    new_file: true,
    renamed_file: false,
    deleted_file: false,
    diff: '@@ -0,0 +1,10 @@\n+test("refresh token", () => {});'
  },
  {
    old_path: 'src/legacy/auth.js',
    new_path: 'src/legacy/auth.js',
    new_file: false,
    renamed_file: false,
    deleted_file: true,
    diff: '@@ -1,20 +0,0 @@\n-function oldAuth() {}'
  }
];

const normalized = gitlabProvider.normalizeChange(mockGitLabCommit, mockGitLabDiffs);

// Provider & Repo assertion
assert(normalized.provider === 'gitlab', 'Provider field must be "gitlab"');
assert(normalized.repository.id === 'group/my-project', 'Repository ID must match configured project ID');
assert(normalized.repository.name === 'my-project', 'Repository name must be parsed from web_url or ID');
assert(normalized.repository.url === 'https://gitlab.com/group/my-project', 'Repository URL should be base project URL');

// Change Metadata assertion
assert(normalized.change.id === mockGitLabCommit.id, 'Change ID must match GitLab commit ID');
assert(normalized.change.author.name === 'Jane GitLab Dev', 'Author name must be extracted');
assert(normalized.change.author.email === 'jane@gitlab.com', 'Author email must be extracted');
assert(normalized.change.message === mockGitLabCommit.message, 'Message must be extracted');
assert(normalized.change.timestamp === '2026-08-10T01:00:00.000Z', 'Timestamp must be extracted');

// Changes array assertion
assert(normalized.changes.length === 3, 'Must normalize 3 file changes');

// Added file test
assert(normalized.changes[1].path === 'src/auth/oauth.test.js', 'Added file path should match');
assert(normalized.changes[1].status === 'added', 'new_file: true must map to status "added"');
assert(normalized.changes[1].additions === 1, 'Added file additions line count should be calculated');

// Modified file test
assert(normalized.changes[0].path === 'src/auth/oauth.js', 'Modified file path should match');
assert(normalized.changes[0].status === 'modified', 'Modified file status should be "modified"');
assert(normalized.changes[0].additions === 3, 'Modified file additions should be calculated');

// Deleted file test
assert(normalized.changes[2].path === 'src/legacy/auth.js', 'Deleted file path should match');
assert(normalized.changes[2].status === 'deleted', 'deleted_file: true must map to status "deleted"');
assert(normalized.changes[2].deletions === 1, 'Deleted file deletions line count should be calculated');

assert(typeof normalized.rawDiff === 'string' && normalized.rawDiff.length > 0, 'rawDiff aggregated string must be present');
console.log('  ✅ Normalization contract for author, message, changeId, repo, and file diffs verified.');

// ──────────────────────────────────────────────────────────────────────────────
// 4. Edge Cases (Missing patch, empty file list)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n4) Testing GitLabProvider edge cases (missing patch, empty file list)');
const mockCommitNoPatch = {
  id: 'gitlab-nopatch-123',
  title: 'docs: update gitlab info',
  author_name: 'Doc Dev'
};
const normalizedNoPatch = gitlabProvider.normalizeChange(mockCommitNoPatch, []);
assert(normalizedNoPatch.change.id === 'gitlab-nopatch-123', 'Should extract change ID for commit without diffs');
assert(normalizedNoPatch.changes.length === 0, 'Changes list should be empty');
assert(typeof normalizedNoPatch.rawDiff === 'string', 'rawDiff fallback string should be present');
console.log('  ✅ Edge cases handled gracefully without crashes.');

// ──────────────────────────────────────────────────────────────────────────────
// 5. Factory Registration Verification
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n5) Testing Factory Registration for GitLabProvider');
const factoryProvider = getSourceControlProvider('gitlab');
assert(factoryProvider.getName() === 'gitlab', 'Factory must instantiate registered GitLabProvider');
console.log('  ✅ Factory registration verified.');

// ──────────────────────────────────────────────────────────────────────────────
// 6. Pipeline Integration with Normalized GitLab Event
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n6) Testing existing PulseBoardPipeline consuming NormalizedChangeEvent from GitLab');
async function testPipelineIntegration() {
  const task = await store.addTask({
    id: `task-gl-${Date.now()}`,
    title: 'Implement OAuth2 token refresher authentication',
    description: 'Add refreshOAuthToken logic in src/auth/oauth.js module',
    status: 'todo',
    assignee: 'Jane'
  });

  const pipelineResult = await pipeline.processChangeEvent(normalized);
  assert(pipelineResult.processed === true, 'Pipeline must process normalized GitLab event');
  assert(pipelineResult.updatedTask !== null, 'Pipeline must match and update task');
  assert(pipelineResult.updatedTask.id === task.id, 'Pipeline must match the correct task');
  console.log(`  ✅ Pipeline successfully processed GitLab event for task "${task.title}" ➔ ${pipelineResult.updatedTask.status}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Provider-Scoped Idempotency Verification
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n7) Testing provider-scoped idempotency (GitLab vs GitHub)');
async function testIdempotency() {
  const gitlabChangeId = 'gl-dup-' + Math.random().toString(16).substring(2, 9);

  // Check before logging
  const existsBefore = await store.hasProcessedChange(gitlabChangeId, 'gitlab', 'group/my-project');
  assert(existsBefore === false, 'Change should not exist yet');

  // Add activity record for GitLab
  await store.addActivityLog({
    id: `act-gl-${Date.now()}`,
    provider: 'gitlab',
    repositoryId: 'group/my-project',
    repositoryName: 'my-project',
    changeId: gitlabChangeId,
    sha: gitlabChangeId,
    author: 'Jane',
    message: 'test idempotency',
    matchedTask: 'OAuth task',
    statusShift: '➔ in_progress',
    summary: 'GitLab change',
    confidence: 'high',
    timestamp: new Date().toISOString()
  });

  // Duplicate check for SAME provider + repo
  const existsGitLab = await store.hasProcessedChange(gitlabChangeId, 'gitlab', 'group/my-project');
  assert(existsGitLab === true, 'Same provider + repo + changeId must be detected as duplicate');

  // Check for DIFFERENT provider (github) with SAME change ID
  const existsGitHub = await store.hasProcessedChange(gitlabChangeId, 'github', 'group/my-project');
  assert(existsGitHub === false, 'Same changeId under GitHub must NOT be marked duplicate');

  console.log('  ✅ Provider-scoped idempotency between GitLab and GitHub verified.');
}

// ──────────────────────────────────────────────────────────────────────────────
// Run all tests
// ──────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await testPipelineIntegration();
  await testIdempotency();

  console.log(`\n${'─'.repeat(60)}`);
  if (failed > 0) {
    console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} GITLAB PROVIDER TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
