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

console.log('🧪 Starting Explicit Task ID Pipeline Integration Test Suite (Canonical PLS-953 Verification)...\n');

async function runTests() {
  // Wait for MongoDB connection
  await new Promise(r => setTimeout(r, 2000));

  try {
    // Clear tasks & activity
    await store.clearTasks();

    // ──────────────────────────────────────────────────────────────────────────
    // Setup Test Task (Canonical Task PLS-953)
    // ──────────────────────────────────────────────────────────────────────────
    const targetTaskKey = 'PLS-953';
    const targetTaskId = `task-${Date.now()}`;
    const initialTask = await store.addTask({
      id: targetTaskId,
      key: targetTaskKey,
      title: 'Add GitLab integration test documentation',
      description: 'Document live GitLab connection testing flow',
      status: 'todo',
      assignee: 'Khidmat'
    });

    const tasksBefore = await store.getTasks();
    assert(tasksBefore.length === 1, 'Board must have exactly 1 initial task before commit');
    assert(tasksBefore[0].key === 'PLS-953', 'Initial task key must be PLS-953');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Explicit Commit [PLS-953] Matching Existing Task
    // ──────────────────────────────────────────────────────────────────────────
    console.log('1) Testing Explicit Commit [PLS-953] matching existing task PLS-953');
    const linkedEvent = {
      provider: 'gitlab',
      repository: { id: 'PulseBoard-GitLab-Test', name: 'PulseBoard-GitLab-Test', url: 'https://gitlab.com/PulseBoard-GitLab-Test' },
      change: {
        id: 'sha-' + Math.random().toString(16).substring(2, 9),
        message: '[PLS-953] feat: add GitLab integration test documentation',
        author: { name: 'Khidmat', email: 'khidmat@example.com' },
        timestamp: new Date().toISOString()
      },
      changes: [{ path: 'README.md', status: 'modified', additions: 15, deletions: 0, patch: '@@ -1,5 +1,15 @@\n+GitLab Integration Testing Documentation' }],
      rawDiff: 'diff --git a/README.md b/README.md\n+GitLab Integration Testing Documentation'
    };

    const res1 = await pipeline.processChangeEvent(linkedEvent);
    assert(res1.processed === true, 'Pipeline must process linked commit');
    assert(res1.updatedTask !== null, 'Target task PLS-953 must be updated');
    assert(res1.updatedTask.key === 'PLS-953', 'Updated task key must equal "PLS-953"');
    assert(['in_progress', 'review', 'done'].includes(res1.updatedTask.status), 'Task status must shift from todo');

    const tasksAfter = await store.getTasks();
    assert(tasksAfter.length === 1, 'NO new task must be created — task count must remain exactly 1');
    assert(tasksAfter[0].key === 'PLS-953', 'Single existing task PLS-953 must remain updated');
    console.log(`  ✅ Existing task PLS-953 updated ➔ ${res1.updatedTask.status}. Task count remained 1.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Explicit Commit with Non-Existent Task Key [PLS-999]
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n2) Testing Explicit Commit with Non-Existent Task Key [PLS-999]');
    const missingTaskEvent = {
      provider: 'gitlab',
      repository: { id: 'PulseBoard-GitLab-Test', name: 'PulseBoard-GitLab-Test', url: 'https://gitlab.com/PulseBoard-GitLab-Test' },
      change: {
        id: 'sha-' + Math.random().toString(16).substring(2, 9),
        message: '[PLS-999] fix: attempt to link non-existent task PLS-999',
        author: { name: 'Developer', email: 'dev@example.com' },
        timestamp: new Date().toISOString()
      },
      changes: [],
      rawDiff: ''
    };

    const res2 = await pipeline.processChangeEvent(missingTaskEvent);
    assert(res2.processed === true, 'Pipeline must process commit safely without crashing');
    assert(res2.updatedTask === null, 'No task should be updated when PLS-999 does not exist');

    const tasksAfterMissing = await store.getTasks();
    assert(tasksAfterMissing.length === 1, 'NO new task must be created for non-existent PLS-999');

    const activityLog = await store.getActivityLog();
    const lastActivity = activityLog[0];
    assert(lastActivity.matchedTask === 'Referenced task not found', 'Activity log must indicate referenced task not found');
    assert(lastActivity.summary.includes('PLS-999'), 'Summary must mention non-existent Task ID PLS-999');
    console.log('  ✅ Non-existent PLS-999 safely logged without task creation or updating wrong tasks.');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Activity Log & Task Key Attribution
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n3) Testing Activity Log Attribution for PLS-953');
    const matchedActivity = activityLog.find(a => a.changeId === linkedEvent.change.id.substring(0, 7) || a.sha === linkedEvent.change.id.substring(0, 7));
    assert(matchedActivity !== undefined, 'Activity log must exist for linked commit');
    assert(matchedActivity.matchedTask.includes('PLS-953'), 'Activity log matchedTask must reference PLS-953');
    console.log(`  ✅ Activity log correctly references task "${matchedActivity.matchedTask}".`);

  } catch (err) {
    console.error('❌ Test execution error:', err);
    failed++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failed > 0) {
    console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} CANONICAL TASK ID PIPELINE TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Execution error:', err);
  process.exit(1);
});
