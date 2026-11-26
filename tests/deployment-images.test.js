const { test } = require('node:test');
const assert = require('node:assert/strict');
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

test('content-only publication advances the site patch and leaves the API version alone', () => {
  const { nextVersion } = require('../scripts/release-version');
  const commits = 'chore(content): update blog content\nchore: release blog images';
  assert.equal(nextVersion('0.1.2', commits, true), '0.1.3');
  assert.equal(nextVersion('0.1.2', commits), '');
  assert.equal(nextVersion('0.1.2', 'feat: update the site', true), '0.2.0');
});

test('only published components advance in the release record', t => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-release-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const record = path.join(directory, 'release.json');
  fs.copyFileSync('release.json', record);
  const previous = JSON.parse(fs.readFileSync(record, 'utf8'));
  const source = 'a'.repeat(40);
  const content = 'b'.repeat(40);
  execFileSync(process.execPath, [require.resolve('../scripts/release-version'), 'record'], {
    cwd: directory,
    env: {...process.env, SOURCE_SHA: source, CONTENT_SHA: content, SITE_VERSION: '1.2.3', COMMENTS_VERSION: ''},
  });
  const updated = JSON.parse(fs.readFileSync(record, 'utf8'));
  assert.deepEqual(updated.site, {version: '1.2.3', source, content});
  assert.deepEqual(updated.comments, previous.comments);
});

test('image publication reuses a matching tag and refuses a conflicting tag', t => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-image-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const calls = path.join(directory, 'calls');
  const staged = 'sha256:' + 'a'.repeat(64);
  const published = 'sha256:' + 'b'.repeat(64);
  const source = 'c'.repeat(40);
  const content = 'd'.repeat(40);
  fs.writeFileSync(path.join(directory, 'docker'), [
    '#!/bin/sh',
    'case "$1/$2/$3" in',
    '  buildx/imagetools/inspect) printf "%s\\n" "$PUBLISHED_DIGEST" ;;',
    '  pull/--platform/linux/amd64) exit 0 ;;',
    '  image/inspect/*) case "$5" in',
    '    *org.opencontainers.image.revision*) printf "%s\\n" "$PUBLISHED_SOURCE" ;;',
    '    *) printf "%s\\n" "$PUBLISHED_CONTENT" ;;',
    '  esac ;;',
    '  *) printf "%s\\n" "$*" >> "$TEST_CALLS"; exit 99 ;;',
    'esac',
    '',
  ].join('\n'), {mode: 0o700});
  const publish = (digest, revision) => spawnSync('bash', [
    path.resolve('scripts/publish-image.sh'), 'anyflow-blog', '0.1.3', staged, source, content,
  ], {
    env: {
      ...process.env, PATH: directory + ':' + process.env.PATH, TEST_CALLS: calls,
      PUBLISHED_DIGEST: digest, PUBLISHED_SOURCE: revision, PUBLISHED_CONTENT: content,
    },
    encoding: 'utf8',
  });
  assert.equal(publish(staged, '').status, 0);
  assert.equal(publish(published, source).status, 0);
  const conflict = publish(published, 'e'.repeat(40));
  assert.equal(conflict.status, 1);
  assert.match(conflict.stderr, /already exists for different inputs/);
  assert.equal(fs.existsSync(calls), false);
});
