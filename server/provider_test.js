import { GitHubProvider } from './integrations/github/github.provider.js';
import { getSourceControlProvider, registerProvider } from './providers/factory.js';
import { GeminiAnalyzer } from './analyzer/gemini.analyzer.js';
import { SourceControlProvider } from './integrations/base.provider.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting Source Control Provider Abstraction Test Suite...\n');

// Test 1: GitHubProvider Normalization
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
assert(normalized.changes.length === 2, 'Should normalize 2 changed files');
assert(normalized.changes[0].path === 'src/auth/login.js', 'File 1 path should match');
assert(normalized.changes[0].status === 'modified', 'File 1 status should be modified');
assert(normalized.changes[1].status === 'added', 'File 2 status should be added');
console.log('  ✅ GitHub response correctly normalized into NormalizedChangeEvent schema.');

// Test 2: Provider Factory Selection & Custom Provider Registration
console.log('\n2) Testing Provider Factory & Selection');
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
console.log('  ✅ Factory correctly instantiates configured & registered providers.');

// Test 3: Analyzer with Normalized Event
console.log('\n3) Testing GeminiAnalyzer consuming NormalizedChangeEvent');
const analyzer = new GeminiAnalyzer();
const mockTasks = [
  { id: 'task-101', title: 'Implement user login authentication validation', description: 'Add validateLogin helper function in auth module', status: 'todo', assignee: 'Alice' }
];

async function testAnalyzer() {
  const result = await analyzer.analyzeChangeEvent(normalized, mockTasks);
  assert(result.matchedTaskId === 'task-101', 'Should match task-101 based on auth tokens');
  assert(['in_progress', 'review', 'done'].includes(result.newStatus), 'Should assign valid status');
  assert(typeof result.summary === 'string', 'Summary should be string');
  console.log(`  ✅ Analyzer returned matchedTaskId="${result.matchedTaskId}", newStatus="${result.newStatus}", summary="${result.summary}"`);
}

// Test 4: Missing & Edge Case Payloads
console.log('\n4) Testing Edge Cases (Missing patch, empty file list)');
const mockCommitNoPatch = {
  sha: 'xyz987',
  commit: {
    message: 'docs: update readme',
    author: { name: 'Bob' }
  }
};
const normalizedNoPatch = ghProvider.normalizeChange(mockCommitNoPatch, { files: [] });
assert(normalizedNoPatch.change.id === 'xyz987', 'Should handle change without files/patches');
assert(normalizedNoPatch.changes.length === 0, 'Changes list should be empty');
console.log('  ✅ Edge cases handled gracefully without exceptions.');

testAnalyzer().then(() => {
  console.log('\n🎉 ALL SOURCE CONTROL PROVIDER ABSTRACTION TESTS PASSED SUCCESSFULY!');
}).catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
