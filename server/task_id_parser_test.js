import { parsePulseBoardTaskId } from './task-id.parser.js';

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

console.log('🧪 Starting Task ID Parser Unit Test Suite (Canonical PLS-953 Correction)...\n');

// ──────────────────────────────────────────────────────────────────────────────
// 1. Canonical Task Key: [PLS-953]
// ──────────────────────────────────────────────────────────────────────────────
console.log('1) Testing Canonical Task Key [PLS-953] extraction');
const res1 = parsePulseBoardTaskId('[PLS-953] feat: add GitLab integration test documentation');
assert(res1.hasTaskId === true, 'hasTaskId must be true');
assert(res1.taskId === 'PLS-953', 'taskId must be "PLS-953"');
assert(res1.cleanMessage === 'feat: add GitLab integration test documentation', 'cleanMessage must have tag removed');
assert(res1.rawTag === '[PLS-953]', 'rawTag must match original tag string');
console.log('  ✅ Canonical [PLS-953] successfully parsed.');

// ──────────────────────────────────────────────────────────────────────────────
// 2. Canonical Task Key: [PLS-101]
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n2) Testing Canonical Task Key [PLS-101] extraction');
const res2 = parsePulseBoardTaskId('[PLS-101] fix: authentication token expiration');
assert(res2.hasTaskId === true, 'hasTaskId must be true');
assert(res2.taskId === 'PLS-101', 'taskId must be "PLS-101"');
assert(res2.cleanMessage === 'fix: authentication token expiration', 'cleanMessage must be cleaned');
assert(res2.rawTag === '[PLS-101]', 'rawTag must match');
console.log('  ✅ Canonical [PLS-101] successfully parsed.');

// ──────────────────────────────────────────────────────────────────────────────
// 3. Prefixed Task ID: [task-101]
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n3) Testing Prefixed [task-101] extraction');
const res3 = parsePulseBoardTaskId('[task-101] refactor: database schema indexes');
assert(res3.hasTaskId === true, 'hasTaskId must be true');
assert(res3.taskId === 'task-101', 'taskId must be "task-101"');
assert(res3.cleanMessage === 'refactor: database schema indexes', 'cleanMessage must be cleaned');
console.log('  ✅ Prefixed "task-101" parsed.');

// ──────────────────────────────────────────────────────────────────────────────
// 4. Case Insensitive Tag: [pls-953]
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n4) Testing Case-Insensitive [pls-953] tag');
const res4 = parsePulseBoardTaskId('[pls-953] docs: update readme');
assert(res4.hasTaskId === true, 'hasTaskId must be true');
assert(res4.taskId === 'pls-953', 'taskId must be extracted');
assert(res4.cleanMessage === 'docs: update readme', 'cleanMessage must be cleaned');
console.log('  ✅ Case insensitive tag parsed.');

// ──────────────────────────────────────────────────────────────────────────────
// 5. Normal Commit (No Task Tag)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n5) Testing Normal Commit (No Task Tag)');
const normalMsg = 'chore: update dependencies & packages';
const res5 = parsePulseBoardTaskId(normalMsg);
assert(res5.hasTaskId === false, 'hasTaskId must be false for normal commit');
assert(res5.taskId === null, 'taskId must be null');
assert(res5.cleanMessage === normalMsg, 'cleanMessage must equal original message');
assert(res5.rawTag === null, 'rawTag must be null');
console.log('  ✅ Normal commit correctly left unmodified.');

// ──────────────────────────────────────────────────────────────────────────────
// 6. Edge Cases & Malformed Inputs
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n6) Testing Edge Cases & Malformed Inputs');
assert(parsePulseBoardTaskId(null).hasTaskId === false, 'null input must return hasTaskId: false');
assert(parsePulseBoardTaskId(undefined).hasTaskId === false, 'undefined input must return hasTaskId: false');
assert(parsePulseBoardTaskId('').hasTaskId === false, 'empty string must return hasTaskId: false');

const resColon = parsePulseBoardTaskId('[PLS-953]: feat: add colon after tag');
assert(resColon.hasTaskId === true, 'Tag with colon suffix must be parsed');
assert(resColon.taskId === 'PLS-953', 'taskId must be "PLS-953"');
assert(resColon.cleanMessage === 'feat: add colon after tag', 'Leading colon must be cleaned from message');

console.log('  ✅ Edge cases handled gracefully without exceptions.');

console.log(`\n${'─'.repeat(60)}`);
if (failed > 0) {
  console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
  process.exit(1);
} else {
  console.log(`🎉 ALL ${passed} TASK ID PARSER TESTS PASSED SUCCESSFULLY!`);
  process.exit(0);
}
