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

test('content-only publication advances the release patch', () => {
  const { nextVersion } = require('../scripts/release-version');
  const commits = 'chore(content): update blog content\nchore: release blog images';
  assert.equal(nextVersion('0.1.2', commits, true), '0.1.3');
  assert.equal(nextVersion('0.1.2', commits), '');
  assert.equal(nextVersion('0.1.2', 'feat: update the site', true), '0.2.0');
});

test('release tags carry both digests and plan one version for approved content and code', t => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-release-'));
  t.after(() => fs.rmSync(cwd, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
  const execute = (...args) => execFileSync(process.execPath, [
    require.resolve('../scripts/release-version'), ...args,
  ], {cwd, encoding: 'utf8'}).trim();
  const first = 'a'.repeat(40), next = 'b'.repeat(40);
  const site = 'sha256:' + 'c'.repeat(64), comments = 'sha256:' + 'd'.repeat(64);
  git('init', '-q');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  const content = path.join(cwd, 'content.lock');
  fs.writeFileSync(content, first + '\n');
  git('add', 'content.lock');
  git('commit', '-qm', 'chore: seed release');
  const source = git('rev-parse', 'HEAD');
  git('tag', '-a', 'v0.1.4', '-m', [
    'Release v0.1.4', 'Content-Revision: ' + first, 'Site-Digest: ' + site,
    'Comments-Digest: ' + comments,
  ].join('\n'));
  assert.deepEqual(JSON.parse(execute('published')), {
    tag: 'v0.1.4', version: '0.1.4', source, content: first, site, comments,
  });
  assert.match(execute('plan'), /^version=$/m);
  fs.writeFileSync(content, next + '\n');
  git('commit', '-qam', 'chore(content): publish new content');
  assert.match(execute('plan'), /^version=0\.1\.5$/m);
  assert.match(execute('plan'), /^build_comments=false$/m);
  const api = path.join(cwd, 'lib/comments');
  fs.mkdirSync(api, {recursive: true});
  fs.writeFileSync(path.join(api, 'api.js'), 'updated');
  git('add', 'lib/comments/api.js');
  git('commit', '-qm', 'feat(comments): update the API');
  assert.match(execute('plan'), /^version=0\.2\.0$/m);
  assert.match(execute('plan'), /^build_comments=true$/m);
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
    path.resolve('scripts/publish-image.sh'), 'blog-app', '0.1.3', staged, source, content,
  ], {
    env: {
      ...process.env, PATH: directory + ':' + process.env.PATH, TEST_CALLS: calls,
      PUBLISHED_DIGEST: digest, PUBLISHED_SOURCE: revision, PUBLISHED_CONTENT: content,
    },
    encoding: 'utf8',
  });
  assert.equal(publish(staged, '').stdout.trim(), staged);
  assert.equal(publish(published, source).stdout.trim(), published);
  const conflict = publish(published, 'e'.repeat(40));
  assert.equal(conflict.status, 1);
  assert.match(conflict.stderr, /already exists for different inputs/);
  assert.equal(fs.existsSync(calls), false);
});

test('retrying the original release completes a partial publication without replacing the site image', t => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-image-retry-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const version = '0.1.6';
  const source = 'a'.repeat(40);
  const content = 'b'.repeat(40);
  const site = 'sha256:' + 'c'.repeat(64);
  const rebuiltSite = 'sha256:' + 'd'.repeat(64);
  const comments = 'sha256:' + 'e'.repeat(64);
  const calls = path.join(directory, 'creates');
  fs.writeFileSync(path.join(directory, 'docker'), [
    '#!/bin/sh',
    'case "$1/$2/$3" in',
    '  buildx/imagetools/inspect)',
    '    record="$TEST_REGISTRY/${4##*/}"',
    '    [ -f "$record" ] || { echo "manifest unknown" >&2; exit 1; }',
    '    cat "$record" ;;',
    '  buildx/imagetools/create)',
    '    record="$TEST_REGISTRY/${6##*/}"',
    '    printf "%s\\n" "$6" >> "$TEST_CREATE_LOG"',
    '    if [ "$TEST_FAIL_COMMENTS" = 1 ]; then echo "registry unavailable" >&2; exit 1; fi',
    '    [ ! -f "$record" ] || exit 99',
    '    printf "%s\\n" "${7##*@}" > "$record" ;;',
    '  pull/--platform/linux/amd64) exit 0 ;;',
    '  image/inspect/*) case "$5" in',
    '    *org.opencontainers.image.revision*) printf "%s\\n" "$TEST_SOURCE" ;;',
    '    *) printf "%s\\n" "$TEST_CONTENT" ;;',
    '  esac ;;',
    '  *) exit 99 ;;',
    'esac',
    '',
  ].join('\n'), {mode: 0o700});
  const publish = (name, digest, fail = false) => spawnSync('bash', [
    path.resolve('scripts/publish-image.sh'), name, version, digest, source, name === 'blog-app' ? content : '',
  ], {
    env: {
      ...process.env, PATH: directory + ':' + process.env.PATH,
      TEST_REGISTRY: directory, TEST_CREATE_LOG: calls, TEST_SOURCE: source, TEST_CONTENT: content,
      TEST_FAIL_COMMENTS: String(Number(fail)),
    },
    encoding: 'utf8',
  });

  assert.equal(publish('blog-app', site).stdout.trim(), site);
  const interrupted = publish('blog-app-comments', comments, true);
  assert.equal(interrupted.status, 1);
  assert.match(interrupted.stderr, /registry unavailable/);
  assert.equal(fs.existsSync(path.join(directory, 'blog-app-comments:' + version)), false);

  assert.equal(publish('blog-app', rebuiltSite).stdout.trim(), site);
  assert.equal(publish('blog-app-comments', comments).stdout.trim(), comments);
  assert.deepEqual(fs.readFileSync(calls, 'utf8').trim().split('\n'), [
    'ghcr.io/anyflow/blog-app:' + version,
    'ghcr.io/anyflow/blog-app-comments:' + version,
    'ghcr.io/anyflow/blog-app-comments:' + version,
  ]);
});
