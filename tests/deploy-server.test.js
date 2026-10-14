const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {once} = require('node:events');
const {createDeployServer} = require('../scripts/deploy-server');
const secret = 'a'.repeat(64);

async function start(t, stateFile, deploy) {
  const server = createDeployServer({secret, stateFile, deploy});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return {server, base: `http://127.0.0.1:${server.address().port}`};
}
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  return path.join(dir, 'state.json');
}
async function request(base, method, route, body = '', timestamp = String(Math.floor(Date.now()/1000)), key = secret) {
  const signature = crypto.createHmac('sha256', key).update(`${timestamp}\n${method}\n${route}\n${body}`).digest('hex');
  const response = await fetch(base + route, {method, headers: {'X-Deploy-Timestamp': timestamp, 'X-Deploy-Signature': `sha256=${signature}`}, ...(method === 'POST' ? {body} : {})});
  return {code: response.status, data: await response.json()};
}
async function finished(base, id) {
  for (let i = 0; i < 100; i++) {
    const {data} = await request(base, 'GET', `/api/deploy/${id}`);
    if (['succeeded', 'failed'].includes(data.status)) return data;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('Job did not finish');
}
test('deploy rejects unsigned, stale, forged, arbitrary and oversized requests', async t => {
  let calls = 0;
  const {base} = await start(t, fixture(t), async () => { calls++; });
  assert.equal((await fetch(base + '/api/deploy', {method: 'POST', body:'{}'})).status, 401);
  const body = JSON.stringify({run_id:'123-1'});
  assert.equal((await request(base,'POST','/api/deploy',body,'1000000000')).code,401);
  assert.equal((await request(base,'POST','/api/deploy',body,undefined,'wrong')).code,401);
  assert.equal((await request(base,'POST','/api/deploy',JSON.stringify({run_id:'123-1',command:'whoami'}))).code,400);
  assert.equal((await request(base,'POST','/api/deploy','x'.repeat(4097))).code,413);
  assert.equal(calls,0);
});
test('deploy serializes requests, persists idempotence and authenticates status path', async t => {
  const stateFile = fixture(t);
  let calls=0, active=0, peak=0;
  const deploy=async()=> { calls++; peak=Math.max(peak,++active); await new Promise(resolve=>setTimeout(resolve,20)); active--; };
  const {base,server}=await start(t,stateFile,deploy);
  await Promise.all(['123-1','124-1','123-1'].map(id=>request(base,'POST','/api/deploy',JSON.stringify({run_id:id}))));
  assert.equal((await finished(base,'124-1')).status,'succeeded');
  assert.equal(calls,2); assert.equal(peak,1);
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=crypto.createHmac('sha256',secret).update(`${timestamp}\nGET\n/api/deploy/123-1\n`).digest('hex');
  assert.equal((await fetch(base+'/api/deploy/124-1',{headers:{'X-Deploy-Timestamp':timestamp,'X-Deploy-Signature':`sha256=${signature}`}})).status,401);
  server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
  const restarted=await start(t,stateFile,deploy);
  assert.equal((await request(restarted.base,'POST','/api/deploy',JSON.stringify({run_id:'123-1'}))).data.status,'succeeded');
  assert.equal(calls,2);
  assert.equal(fs.statSync(stateFile).mode & 0o777,0o600);
});
test('failed deployments expose no raw error and queued jobs resume on restart', async t => {
  const stateFile=fixture(t);
  fs.writeFileSync(stateFile,JSON.stringify({jobs:{'123-1':{job_id:'123-1',status:'running'}}}));
  const {base}=await start(t,stateFile,async()=> {throw new Error('SECRET TOKEN');});
  const result=await finished(base,'123-1');
  assert.equal(result.status,'failed'); assert.ok(result.finished_at);
  assert.ok(!JSON.stringify(result).includes('SECRET TOKEN'));
});
