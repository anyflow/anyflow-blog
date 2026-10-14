const { createHmac } = require('node:crypto');

function signature(secret, timestamp, method, path, body = '') {
  return 'sha256=' + createHmac('sha256', secret)
    .update(timestamp + '\n' + method + '\n' + path + '\n' + body).digest('hex');
}
async function request(method, url, body = '') {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-deploy-timestamp': timestamp,
      'x-deploy-signature': signature(process.env.DEPLOY_SECRET, timestamp, method, url.pathname, body),
    },
    ...(method === 'POST' ? { body } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Deploy API returned ' + response.status);
  return response.json();
}
async function main() {
  if (!process.env.DEPLOY_SECRET) throw new Error('DEPLOY_SECRET is missing');
  const url = new URL(process.env.DEPLOY_URL);
  if (url.protocol !== 'https:') throw new Error('Deploy endpoint must use HTTPS');
  const body = JSON.stringify({ run_id: process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT });
  let job;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { job = await request('POST', url, body); break; }
    catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  const statusUrl = new URL(url.href + '/' + encodeURIComponent(job.job_id));
  for (let attempt = 0; attempt < 90; attempt++) {
    const status = await request('GET', statusUrl);
    console.log('Deployment ' + status.job_id + ': ' + status.status);
    if (status.status === 'succeeded') return;
    if (status.status === 'failed') throw new Error('Deployment failed; see homeserver deploy log');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Deployment status timed out');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { signature };
