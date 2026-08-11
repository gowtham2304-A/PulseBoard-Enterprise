import { store } from './store.js';
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

console.log('🧪 Starting Explicit Task ID Pipeline Integration Test Suite (Phase 2.9)...\n');

async function runTests() {
  // Wait for MongoDB connection
  await new Promise(r => setTimeout(r, 2000));

  try {
    // Clear tasks & activity
    await store.clearTasks();

    // ──────────────────────────────────────────────────────────────────────────
    // Setup Test Tasks
    // ──────────────────────────────────────────────────────────────────────────
    const targetTaskId = `task-explicit-${Date.now()}`;
    const targetTask = await store.addTask({
      id: targetTaskId,
      key: 'PLS-777',
      title: 'Implement explicit task attribution in pipeline',
      description: 'Parse [PB-...] prefix from commit messages',
      status: 'todo',
      assignee: 'Khidmat'
    });

    const otherTask = await store.addTask({
      id: `task-other-${Date.now()}`,
      key: 'PLS-888',
      title: 'Build unrelated user profile settings modal',
      description: 'Frontend component for user profile',
      status: 'todo',
      assignee: 'Vansh'
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Explicit Linked Commit [PB-<TASK_ID>] Matching Target Task
    // ──────────────────────────────────────────────────────────────────────────
    console.log('1) Testing Explicit Linked Commit [PB-<TASK_ID>] matching target task');
    const linkedEvent = {
      provider: 'github',
      repository: { id: 'owner/repo', name: 'repo', url: 'https://github.com/owner/repo' },
      change: {
        id: 'sha-' + Math.random().toString(16).substring(2, 9),
        message: `[PB-${targetTaskId}] feat: complete explicit task attribution pipeline integration`,
        author: { name: 'Khidmat', email: 'khidmat@example.com' },
        timestamp: new Date().toISOString()
      },
      changes: [{ path: 'server/pipeline.js', status: 'modified', additions: 25, deletions: 2, patch: '@@ -1,5 +1,25 @@\n+parsePulseBoardTaskId' }],
      rawDiff: 'diff --git a/server/pipeline.js b/server/pipeline.js\n+parsePulseBoardTaskId'
    };

    const res1 = await pipeline.processChangeEvent(linkedEvent);
    assert(res1.processed === true, 'Pipeline must process linked commit');
    assert(res1.updatedTask !== null, 'Target task must be updated');
    assert(res1.updatedTask.id === targetTaskId, 'Updated task must match the explicit Task ID in commit message');
    assert(['in_progress', 'review', 'done'].includes(res1.updatedTask.status), 'Task status must be updated');
    console.log(`  ✅ Explicit linked commit updated target task "${res1.updatedTask.title}" ➔ ${res1.updatedTask.status}.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Explicit Linked Commit with Non-Existent Task ID [PB-9999999]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n2) Testing Explicit Linked Commit with Non-Existent Task ID [PB-9999999]');
    const missingTaskEvent = {
      provider: 'github',
      repository: { id: 'owner/repo', name: 'repo', url: 'https://github.com/owner/repo' },
      change: {
        id: 'sha-' + Math.random().toString(16).substring(2, 9),
        message: '[PB-nonexistent-9999999] fix: attempt to link non-existent task',
        author: { name: 'Developer', email: 'dev@example.com' },
        timestamp: new Date().toISOString()
      },
      changes: [],
      rawDiff: ''
    };

    const res2 = await pipeline.processChangeEvent(missingTaskEvent);
    assert(res2.processed === true, 'Pipeline must process commit safely without crashing');
    assert(res2.updatedTask === null, 'No task should be updated when explicit Task ID does not exist');

    const activityLog = await store.getActivityLog();
    const lastActivity = activityLog[0];
    assert(lastActivity.matchedTask === 'Referenced task not found', 'Activity log must indicate referenced task not found');
    assert(lastActivity.summary.includes('nonexistent-9999999'), 'Summary must mention the missing Task ID');
    console.log('  ✅ Non-existent Task ID safely handled without guessing or updating wrong tasks.');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Normal Commit (No [PB-...] Tag) Fallback AI Matching
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n3) Testing Normal Commit (No [PB-...] Tag) Fallback AI Matching');
    const normalEvent = {
      provider: 'gitlab',
      repository: { id: 'group/project', name: 'project', url: 'https://gitlab.com/group/project' },
      change: {
        id: 'sha-' + Math.random().toString(16).substring(2, 9),
        message: 'feat(profile): build user profile settings page component',
        author: { name: 'Vansh', email: 'vansh@example.com' },
        timestamp: new Date().toISOString()
      },
      changes: [{ path: 'src/components/UserProfile.jsx', status: 'added', additions: 50, deletions: 0, patch: '@@ -0,0 +1,50 @@\n+export function UserProfile() {}' }],
      rawDiff: 'diff --git a/src/components/UserProfile.jsx b/src/components/UserProfile.jsx\n+export function UserProfile() {}'
    };

    const res3 = await pipeline.processChangeEvent(normalEvent);
    assert(res3.processed === true, 'Pipeline must process normal commit');
    assert(res3.updatedTask !== null, 'Normal commit should use fallback AI matching');
    assert(res3.updatedTask.id === otherTask.id, 'Fallback AI matching should match the profile settings task');
    console.log(`  ✅ Normal commit fallback AI matched task "${res3.updatedTask.title}" ➔ ${res3.updatedTask.status}.`);

  } catch (err) {
    console.error('❌ Test execution error:', err);
    failed++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failed > 0) {
    console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} EXPLICIT TASK ID PIPELINE TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Execution error:', err);
  process.exit(1);
});
