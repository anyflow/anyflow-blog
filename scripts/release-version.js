const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const subjectPattern = /^[a-z][a-z0-9-]*(\([^()\r\n]+\))?!?: \S/;
const versionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function releaseLevel(messages) {
  if (/(^|\s)BREAKING[ -]CHANGE\s*:|^[a-z0-9-]+(\([^)]*\))?!:/m.test(messages)) return 3;
  if (/^feat(\([^)]*\))?:/m.test(messages)) return 2;
  if (/^(fix|perf)(\([^)]*\))?:/m.test(messages)) return 1;
  return 0;
}

function bump(version, level) {
  assert.match(version, versionPattern);
  const [major, minor, patch] = version.split('.').map(Number);
  return ['', `${major}.${minor}.${patch + 1}`, `${major}.${minor + 1}.0`, `${major + 1}.0.0`][level];
}

const revisionPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;

function publishedRelease(ref = 'HEAD') {
  const tag = git('tag', '--merged', ref, '--list', 'v*', '--sort=-version:refname')
    .split('\n').find(name => name.startsWith('v') && versionPattern.test(name.slice(1)));
  assert.ok(tag, 'An annotated vX.Y.Z release tag is required');
  assert.equal(git('cat-file', '-t', 'refs/tags/' + tag), 'tag', tag + ' must be annotated');
  const notes = git('for-each-ref', '--format=%(contents)', 'refs/tags/' + tag);
  function field(name, pattern) {
    const matches = notes.split('\n').filter(line => line.startsWith(name + ': '));
    assert.equal(matches.length, 1, tag + ' must have one ' + name);
    const value = matches[0].slice(name.length + 2);
    assert.match(value, pattern);
    return value;
  }
  return {
    tag,
    version: tag.slice(1),
    source: git('rev-parse', tag + '^{commit}'),
    content: field('Content-Revision', revisionPattern),
    site: field('Site-Digest', digestPattern),
    comments: field('Comments-Digest', digestPattern),
  };
}

function nextVersion(current, messages, contentChanged = false) {
  return bump(current, Math.max(releaseLevel(messages), Number(contentChanged)));
}

function assertSubject(subject) {
  assert.match(subject, subjectPattern, 'Use type(scope): description, e.g. fix: correct login');
}

if (require.main === module) {
  const [command, value] = process.argv.slice(2);
  if (command === 'commit-msg') {
    const subject = fs.readFileSync(value, 'utf8').split(/\r?\n/, 1)[0];
    if (!subject.startsWith('Merge ')) assertSubject(subject);
  } else if (command === 'check-range') {
    if (value && !/^0+$/.test(value)) {
      for (const subject of git('log', '--no-merges', '--format=%s', value + '..HEAD').split('\n').filter(Boolean)) {
        assertSubject(subject);
      }
    }
  } else if (command === 'plan') {
    const previous = publishedRelease();
    const content = fs.readFileSync('content.lock', 'utf8').trim();
    assert.match(content, revisionPattern);
    const messages = git('log', '--no-merges', '--format=%s%n%b', previous.source + '..HEAD');
    const version = nextVersion(previous.version, messages, previous.content !== content);
    const commentsChanged = git('diff', '--name-only', previous.source, 'HEAD', '--',
      'lib/comments', 'scripts/comments-server.js', 'Dockerfile', '.dockerignore');
    console.log('content=' + content);
    console.log('version=' + version);
    console.log('previous_tag=' + previous.tag);
    console.log('build_comments=' + Boolean(version && commentsChanged));
  } else {
    assert.equal(command, 'published');
    console.log(JSON.stringify(publishedRelease(value)));
  }
}
module.exports = { releaseLevel, bump, assertSubject, nextVersion, publishedRelease };
