const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { updateImages } = require('../scripts/update-deployment-images');
const { signature } = require('../scripts/request-deploy');
const digest = 'sha256:' + 'a'.repeat(64);
const source = fs.readFileSync('deployment/deployments.yaml', 'utf8');

test('content publication changes only the site image and preserves other YAML', () => {
  const result = updateImages(source, digest);
  const oldSite = source.match(/image: (ghcr.io\/anyflow\/anyflow-blog[:@]\S+)/)[1];
  assert.equal(result, source.replace(oldSite, 'ghcr.io/anyflow/anyflow-blog@' + digest));
});
test('API publication updates the separate API document', () => {
  assert.ok(updateImages(source, digest, digest).includes('ghcr.io/anyflow/anyflow-blog-comments@' + digest));
});
test('invalid digest or missing target fails closed', () => {
  assert.throws(() => updateImages(source, 'latest'));
  assert.throws(() => updateImages('', digest));
});
test('request signature binds method, path, timestamp and body', () => {
  const sig = signature('test', '123', 'POST', '/api/deploy', '{}');
  assert.match(sig, /^sha256=[a-f0-9]{64}$/);
  for (const args of [
    ['test', '124', 'POST', '/api/deploy', '{}'],
    ['test', '123', 'GET', '/api/deploy', '{}'],
    ['test', '123', 'POST', '/other', '{}'],
    ['test', '123', 'POST', '/api/deploy', '{"x":1}'],
  ]) assert.notEqual(signature(...args), sig);
});
