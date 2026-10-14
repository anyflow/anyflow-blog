const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');

function deployLatest() {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/sh', [path.join(__dirname, 'deploy-latest.sh')], {
      detached: true, stdio: 'ignore', env: process.env,
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    }, 15 * 60 * 1000);
    child.once('error', () => {
      clearTimeout(timer);
      reject(new Error('Deployment could not start'));
    });
    child.once('close', code => {
      clearTimeout(timer);
      if (!timedOut && code === 0) resolve();
      else reject(new Error(timedOut ? 'Deployment timed out' : 'Deployment failed; inspect the host checkout and cluster'));
    });
  });
}

function createDeployServer({secret, stateFile, deploy = deployLatest, now = Date.now}) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('DEPLOY_SECRET must be at least 32 bytes');
  fs.mkdirSync(path.dirname(stateFile), {recursive: true, mode: 0o700});
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {jobs: {}};
  if (!state.jobs || typeof state.jobs !== 'object') throw new Error('Invalid deployment state');
  const save = () => {
    fs.writeFileSync(`${stateFile}.tmp`, JSON.stringify(state), {mode: 0o600});
    fs.renameSync(`${stateFile}.tmp`, stateFile);
  };
  for (const job of Object.values(state.jobs)) {
    if (job.status === 'running') job.status = 'queued';
  }
  let busy = false;
  async function drain() {
    if (busy) return;
    busy = true;
    try {
      for (;;) {
        const job = Object.values(state.jobs).find(item => item.status === 'queued');
        if (!job) break;
        job.status = 'running';
        save();
        try {
          await deploy();
          job.status = 'succeeded';
        } catch {
          job.status = 'failed';
          job.error = 'Deployment failed; inspect the host checkout and cluster';
        }
        job.finished_at = new Date(now()).toISOString();
        save();
      }
    } finally { busy = false; }
  }
  const server = http.createServer(async (req, res) => {
    const reply = (code, data) => {
      res.writeHead(code, {'content-type': 'application/json', 'cache-control': 'no-store'});
      res.end(JSON.stringify(data));
    };
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (req.url !== pathname || !(/^\/api\/deploy(?:\/[0-9]+-[0-9]+)?$/.test(pathname))) return reply(404, {error: 'Not found'});
      if (!['GET', 'POST'].includes(req.method)) return reply(405, {error: 'Method not allowed'});
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 4096) return reply(413, {error: 'Body too large'});
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      const timestamp = req.headers['x-deploy-timestamp'];
      const signature = req.headers['x-deploy-signature'];
      if (typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp) || Math.abs(now() / 1000 - Number(timestamp)) > 300 ||
          typeof signature !== 'string' || !/^sha256=[0-9a-f]{64}$/.test(signature)) return reply(401, {error: 'Unauthorized'});
      const expected = crypto.createHmac('sha256', secret).update(`${timestamp}\n${req.method}\n${pathname}\n`).update(body).digest();
      if (!crypto.timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))) return reply(401, {error: 'Unauthorized'});
      if (req.method === 'GET') {
        if (body.length) return reply(400, {error: 'GET body is not allowed'});
        const job = state.jobs[pathname.slice('/api/deploy/'.length)];
        return job ? reply(200, job) : reply(404, {error: 'Job not found'});
      }
      if (pathname !== '/api/deploy') return reply(405, {error: 'Method not allowed'});
      let payload;
      try { payload = JSON.parse(body.toString('utf8')); } catch { return reply(400, {error: 'Invalid JSON'}); }
      if (!payload || typeof payload !== 'object' || Object.keys(payload).length !== 1 ||
          typeof payload.run_id !== 'string' || !/^\d{1,20}-\d{1,5}$/.test(payload.run_id)) return reply(400, {error: 'Invalid run_id'});
      if (!state.jobs[payload.run_id]) {
        state.jobs[payload.run_id] = {job_id: payload.run_id, status: 'queued', created_at: new Date(now()).toISOString()};
        save();
      }
      reply(202, state.jobs[payload.run_id]);
      setImmediate(() => drain().catch(error => { console.error('Deployment state persistence failed'); server.close(); process.exitCode = 1; }));
    } catch {
      if (!res.headersSent) reply(500, {error: 'Deployment request failed'});
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.once('listening', () => drain().catch(() => { console.error('Deployment state persistence failed'); server.close(); process.exitCode = 1; }));
  return server;
}

if (require.main === module) {
  process.umask(0o077);
  const server = createDeployServer({secret: process.env.DEPLOY_SECRET, stateFile: process.env.DEPLOY_STATE_FILE});
  server.listen(Number(process.env.DEPLOY_PORT || 18767), process.env.DEPLOY_HOST || '192.168.0.4');
}
module.exports = {createDeployServer};
