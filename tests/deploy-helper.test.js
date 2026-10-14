const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
const helper = path.resolve(__dirname, '../scripts/deploy-latest.sh');
function setup(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deploy-helper-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const bin=path.join(dir,'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin,'git'),`#!/bin/sh
printf '%s\\n' "$*" >>"$TEST_CALLS"
case "$*" in
  'remote get-url origin') printf '%s\\n' "$TEST_ORIGIN" ;;
  'branch --show-current') printf '%s\\n' "$TEST_BRANCH" ;;
  'status --porcelain') printf '%s' "$TEST_DIRTY" ;;
  *'fetch --no-tags origin master') exit "\${TEST_FETCH_STATUS:-0}" ;;
  'merge --ff-only origin/master') exit "\${TEST_MERGE_STATUS:-0}" ;;
  *) exit 99 ;;
esac
`,{mode:0o700});
  fs.writeFileSync(path.join(bin,'make'),`#!/bin/sh
[ "$*" = deploy ] || exit 99
mkdir "$TEST_ACTIVE" || exit 98
printf 'make-start\\n' >>"$TEST_CALLS"
sleep 0.05
printf 'make-end\\n' >>"$TEST_CALLS"
rmdir "$TEST_ACTIVE"
`,{mode:0o700});
  const env={...process.env,PATH:`${bin}:${process.env.PATH}`,DEPLOY_CHECKOUT:dir,DEPLOY_STATE_FILE:path.join(dir,'state.json'),TEST_CALLS:path.join(dir,'calls'),TEST_ACTIVE:path.join(dir,'active'),TEST_ORIGIN:'git@github.com:anyflow/anyflow-blog.git',TEST_BRANCH:'master',TEST_DIRTY:''};
  return {env, calls:()=>fs.readFileSync(env.TEST_CALLS,'utf8').trim().split('\n')};
}
test('deploy helper rejects wrong origin/branch/dirty tree and stops after Git failures', async t=> {
  for (const values of [
    {TEST_ORIGIN:'git@github.com:other/repo.git'},
    {TEST_BRANCH:'main'},
    {TEST_DIRTY:'?? untracked.txt'},
    {TEST_FETCH_STATUS:'1'},
    {TEST_MERGE_STATUS:'1'},
  ]) {
    const {env,calls}=setup(t);
    await assert.rejects(exec('/bin/sh',[helper],{env:{...env,...values}}));
    assert.ok(!calls().includes('make-start'));
    if(values.TEST_FETCH_STATUS) assert.ok(!calls().includes('merge --ff-only origin/master'));
  }
});
test('deploy helper fetches and fast-forwards before make and serializes separate processes',async t=> {
  const {env,calls}=setup(t);
  await Promise.all([exec('/bin/sh',[helper],{env}),exec('/bin/sh',[helper],{env})]);
  const expected=['remote get-url origin','branch --show-current','status --porcelain','-c maintenance.autoDetach=false -c gc.autoDetach=false fetch --no-tags origin master','merge --ff-only origin/master','make-start','make-end'];
  assert.deepEqual(calls(),[...expected,...expected]);
  assert.equal(fs.statSync(`${env.DEPLOY_STATE_FILE}.log`).mode & 0o777,0o600);
});
