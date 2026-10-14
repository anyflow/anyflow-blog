const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { updateImages, updateDeployerImage } = require('../scripts/update-deployment-images');
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
test('tools digest changes only CronJob image and rejects invalid input', () => {
  const cron = fs.readFileSync('deployment/cronjob.yaml', 'utf8');
  const old = cron.match(/image: (\S+)/)[1];
  assert.equal(updateDeployerImage(cron, digest), cron.replace(old, 'ghcr.io/anyflow/anyflow-blog-deploy@' + digest));
  assert.throws(() => updateDeployerImage(cron, 'latest'));
  assert.throws(() => updateDeployerImage('', digest));
});
