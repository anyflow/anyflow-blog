const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
const script = path.resolve(__dirname, '../scripts/poll-deploy.sh');
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-deploy-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh
printf '%s\\n' "$*" >>"$TEST_CALLS"
case "$*" in
  *'clone --no-tags --branch master --single-branch '*)
    [ "\${TEST_CLONE_STATUS:-0}" = 0 ] || exit "$TEST_CLONE_STATUS"
    for destination; do :; done
    mkdir -p "$destination/.git" ;;
  'remote get-url origin') printf '%s\\n' "$TEST_ORIGIN" ;;
  'branch --show-current') printf '%s\\n' "$TEST_BRANCH" ;;
  'status --porcelain') printf '%s' "$TEST_DIRTY" ;;
  *'fetch --no-tags origin master') exit "\${TEST_FETCH_STATUS:-0}" ;;
  'merge --ff-only origin/master') exit "\${TEST_MERGE_STATUS:-0}" ;;
  'rev-parse HEAD:deployment') printf '%s\\n' "$TEST_TREE" ;;
  'rev-parse HEAD') printf 'code-sha\\n' ;;
  *) exit 99 ;;
esac
`, {mode:0o700});
  fs.writeFileSync(path.join(bin, 'make'), `#!/bin/sh
[ "$*" = deploy ] || exit 99
printf 'make-deploy\\n' >>"$TEST_CALLS"
sleep "\${TEST_MAKE_SLEEP:-0}"
exit "\${TEST_MAKE_STATUS:-0}"
`, {mode:0o700});
  const env = {...process.env, PATH:`${bin}:${process.env.PATH}`,
    DEPLOY_DATA_DIR:path.join(dir,'data'), TEST_CALLS:path.join(dir,'calls'),
    TEST_ORIGIN:'git@github.com:anyflow/anyflow-blog.git', TEST_BRANCH:'master',
    TEST_DIRTY:'', TEST_TREE:'deployment-tree-1'};
  const run = values => exec('/bin/sh', [script], {env:{...env,...values}});
  const calls = () => fs.existsSync(env.TEST_CALLS) ? fs.readFileSync(env.TEST_CALLS,'utf8').trim().split('\n') : [];
  const state = () => fs.readFileSync(path.join(env.DEPLOY_DATA_DIR,'last-success'),'utf8').trim();
  return {env, run, calls, state};
}
test('bootstrap deploys once; code-only commits skip; changed deployment tree deploys', async t => {
  const {run,calls,state} = setup(t);
  await run();
  assert.equal(state(),'deployment-tree-1');
  await run();
  assert.equal(calls().filter(x=>x==='make-deploy').length,1);
  await run({TEST_TREE:'deployment-tree-2'});
  assert.equal(state(),'deployment-tree-2');
  assert.equal(calls().filter(x=>x==='make-deploy').length,2);
  await run({TEST_TREE:'deployment-tree-1'});
  assert.equal(state(),'deployment-tree-1');
  assert.equal(calls().filter(x=>x==='make-deploy').length,3);
  assert.equal(calls().filter(x=>x.includes('clone --no-tags')).length,1);
});
test('failed apply preserves success marker and retries unchanged target', async t => {
  const {run,calls,state} = setup(t);
  await run();
  await assert.rejects(run({TEST_TREE:'deployment-tree-2',TEST_MAKE_STATUS:'1'}));
  assert.equal(state(),'deployment-tree-1');
  await run({TEST_TREE:'deployment-tree-2'});
  assert.equal(state(),'deployment-tree-2');
  assert.equal(calls().filter(x=>x==='make-deploy').length,3);
});
test('wrong origin, branch, dirty checkout and fetch/merge failures never deploy', async t => {
  for (const values of [{TEST_ORIGIN:'git@github.com:evil/repo.git'},
    {TEST_BRANCH:'other'}, {TEST_DIRTY:' M Makefile'},
    {TEST_FETCH_STATUS:'1'}, {TEST_MERGE_STATUS:'1'}]) {
    const {run,calls,env} = setup(t);
    await assert.rejects(run(values));
    assert.ok(!calls().includes('make-deploy'));
    assert.ok(!fs.existsSync(path.join(env.DEPLOY_DATA_DIR,'last-success')));
  }
});
test('failed initial clone is cleaned and next run retries', async t => {
  const {run,env,state} = setup(t);
  await assert.rejects(run({TEST_CLONE_STATUS:'1'}));
  assert.deepEqual(fs.readdirSync(env.DEPLOY_DATA_DIR),['deploy.lock']);
  await run();
  assert.equal(state(),'deployment-tree-1');
});
test('separate processes cannot overlap deployments', async t => {
  const {run,calls} = setup(t);
  await Promise.all([run({TEST_MAKE_SLEEP:'0.2'}),run({TEST_MAKE_SLEEP:'0.2'})]);
  assert.equal(calls().filter(x=>x==='make-deploy').length,1);
});
