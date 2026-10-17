const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {promisify} = require('node:util'), exec = promisify(require('node:child_process').execFile);
const yaml = require('js-yaml');
const script = path.resolve(__dirname, '../scripts/poll-deploy.sh');
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-deploy-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  const bin = path.join(dir, 'bin');fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh
printf '%s\\n' "$*" >>"$TEST_CALLS"
case "$*" in
  *'clone --depth 1 --no-tags --branch master --single-branch git@github.com:anyflow/anyflow-blog.git '*)
    [ "\${TEST_CLONE_STATUS:-0}" = 0 ] || exit "$TEST_CLONE_STATUS"
    for destination; do :; done
    mkdir -p "$destination/.git" ;;
  'rev-parse HEAD') printf 'code-sha\\n' ;;
  *) exit 99 ;;
esac
`, {mode:0o700});
  fs.writeFileSync(path.join(bin, 'make'), `#!/bin/sh
[ "$*" = deploy ] || exit 99
[ -d .git ] || exit 98
printf 'make-deploy\\n' >>"$TEST_CALLS"
sleep "\${TEST_MAKE_SLEEP:-0}"
exit "\${TEST_MAKE_STATUS:-0}"
`, {mode:0o700});
  const env = {...process.env,PATH:`${bin}:${process.env.PATH}`,DEPLOY_DATA_DIR:path.join(dir,'data'),TEST_CALLS:path.join(dir,'calls')};
  const run = values => exec('/bin/sh', [script], {env:{...env,...values}});
  const calls = () => fs.existsSync(env.TEST_CALLS) ? fs.readFileSync(env.TEST_CALLS,'utf8').trim().split('\n') : [];
  const empty = () => assert.deepEqual(fs.readdirSync(env.DEPLOY_DATA_DIR),[]);
  return {run,calls,empty};
}
test('each run clones a fresh shallow checkout and applies without persistent state',async t=>{
 const {run,calls,empty}=setup(t);await run();empty();await run();empty();
 const clones=calls().filter(x=>x.includes('clone --depth 1'));
 assert.equal(clones.length,2);assert.notEqual(clones[0],clones[1]);
 assert.equal(calls().filter(x=>x==='make-deploy').length,2);
});
test('failed clone never applies and next execution starts clean',async t=>{
 const {run,calls,empty}=setup(t);await assert.rejects(run({TEST_CLONE_STATUS:'1'}));empty();
 assert.ok(!calls().includes('make-deploy'));await run();empty();assert.equal(calls().filter(x=>x==='make-deploy').length,1);
});
test('failed apply cleans temporary data and next execution retries',async t=>{
 const {run,calls,empty}=setup(t);await assert.rejects(run({TEST_MAKE_STATUS:'1'}));empty();await run();empty();
 assert.equal(calls().filter(x=>x==='make-deploy').length,2);
});
test('independent executions do not share checkout files',async t=>{
 const {run,calls,empty}=setup(t);await Promise.all([run({TEST_MAKE_SLEEP:'0.1'}),run({TEST_MAKE_SLEEP:'0.1'})]);empty();
 assert.equal(calls().filter(x=>x==='make-deploy').length,2);
});
test('CronJob uses emptyDir with Forbid and only comments keep a PVC',()=>{
 const cron=yaml.load(fs.readFileSync('deployment/cronjob.yaml','utf8'));
 assert.equal(cron.spec.concurrencyPolicy,'Forbid');
 const pod=cron.spec.jobTemplate.spec.template.spec,workspace=pod.volumes.find(v=>v.name==='workspace');
 assert.deepEqual(workspace.emptyDir,{});assert.ok(!pod.volumes.some(v=>v.persistentVolumeClaim));
 assert.ok(pod.containers[0].volumeMounts.some(v=>v.name==='workspace'&&v.mountPath==='/data'));
 const claims=yaml.loadAll(fs.readFileSync('deployment/persistentvolumeclaims.yaml','utf8'));
 assert.deepEqual(claims.map(c=>c.metadata.name),['anyflow-blog-comments-state']);
});
