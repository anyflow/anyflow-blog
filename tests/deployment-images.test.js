const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { updateImages, updateDeployerImage } = require('../scripts/update-deployment-images');
const digest = 'sha256:' + 'a'.repeat(64);
const version = '0.1.0';
const source = fs.readFileSync('deployment/deployments.yaml', 'utf8');

test('content publication changes only the site image and preserves other YAML', () => {
  const result = updateImages(source, version);
  const oldSite = source.match(/image: (ghcr.io\/anyflow\/anyflow-blog[:@]\S+)/)[1];
  assert.equal(result, source.replace(oldSite, 'ghcr.io/anyflow/anyflow-blog:' + version).replace(/    version: "[^"]+"/, '    version: "' + version + '"'));
});
test('API publication updates the separate API document', () => {
  assert.ok(updateImages(source, '', '0.1.1').includes('ghcr.io/anyflow/anyflow-blog-comments:0.1.1'));
});
test('invalid version or missing target fails closed', () => {
  assert.throws(() => updateImages(source, 'latest'));
  assert.throws(() => updateImages(source, digest));
  assert.throws(() => updateImages('', version));
});
test('tools digest changes only CronJob image and rejects invalid input', () => {
  const cron = fs.readFileSync('deployment/cronjob.yaml', 'utf8');
  const old = cron.match(/image: (\S+)/)[1];
  assert.equal(updateDeployerImage(cron, digest), cron.replace(old, 'ghcr.io/anyflow/anyflow-blog-deploy@' + digest));
  assert.throws(() => updateDeployerImage(cron, 'latest'));
  assert.throws(() => updateDeployerImage('', digest));
});

test('version bump follows the highest Conventional Commit and ignores docs', () => {
  const { releaseLevel, bump, assertSubject } = require('../scripts/release-version');
  assert.equal(bump('1.2.3', releaseLevel('docs: update guide\nchore: refresh config')), '');
  assert.equal(bump('1.2.3', releaseLevel('fix(api): repair login\nperf: faster search')), '1.2.4');
  assert.equal(bump('1.2.3', releaseLevel('fix: repair login\nfeat: add search')), '1.3.0');
  assert.equal(bump('1.2.3', releaseLevel('feat: add search\nfix(api)!: remove old path')), '2.0.0');
  assert.equal(releaseLevel('chore: tidy\n\nBREAKING CHANGE: remove old path'), 3);
  assert.doesNotThrow(() => assertSubject('fix(comments): repair sync'));
  assert.throws(() => assertSubject('repair sync'));
});
