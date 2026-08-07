const BASE = 'https://pulseboard-enterprise.onrender.com';

async function req(path, opts) {
  const res = await fetch(BASE + path, opts);
  const txt = await res.text();
  let body = txt;
  try { body = JSON.parse(txt); } catch(e) {}
  return { status: res.status, body };
}

async function run() {
  console.log('BASE:', BASE);

  console.log('\n1) GET /api/health');
  console.log(await req('/api/health'));

  console.log('\n2) GET /api/tasks');
  const tasksRes = await req('/api/tasks');
  console.log(tasksRes);

  console.log('\n3) POST /api/tasks (create)');
  const newTask = { title: 'Integration test task', status: 'todo', assignee: 'Tester', priority: 'low' };
  const createRes = await req('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask) });
  console.log(createRes);

  const createdId = createRes.body && createRes.body.task && createRes.body.task._id ? createRes.body.task._id : (createRes.body && createRes.body.task && createRes.body.task.id) || null;

  if (!createdId) {
    console.log('Could not determine created task id, will skip PATCH.');
  } else {
    console.log('\n4) PATCH /api/tasks/:id (update status->in_progress)');
    const patchRes = await req(`/api/tasks/${createdId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) });
    console.log(patchRes);
  }

  console.log('\n5) POST /api/commit (simulate commit)');
  const commitPayload = { sha: 'itest123', author: 'Tester', message: 'wip integration', diff: 'diff --git a/file b/file\n+ test' };
  const commitRes = await req('/api/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(commitPayload) });
  console.log(commitRes);

  console.log('\n6) POST /api/chat');
  const chatRes = await req('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'status', userName: 'Tester', userRole: 'Developer' }) });
  console.log(chatRes);

  console.log('\n7) GET /api/activity');
  const actRes = await req('/api/activity');
  console.log(actRes);

  console.log('\nIntegration test complete.');
}

run().catch(e => { console.error('Test error:', e); process.exit(1); });
