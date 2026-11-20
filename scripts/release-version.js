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

function plan(component, current, content = '') {
  const prefix = `${component}-v`;
  const tag = git('tag', '--merged', 'HEAD', '--list', prefix + '*', '--sort=-version:refname')
    .split('\n').find(name => versionPattern.test(name.slice(prefix.length)));
  assert.equal(tag ? tag.slice(prefix.length) : '0.0.0', current,
    `${component}: deployment version and annotated Git tag differ`);
  const range = tag ? tag + '..HEAD' : 'HEAD';
  let level = releaseLevel(git('log', '--no-merges', '--format=%s%n%b', range));
  // The site also publishes when its separately versioned content changes.
  if (component === 'site' && tag && content) {
    const previous = git('for-each-ref', '--format=%(contents)', 'refs/tags/' + tag)
      .match(/^Content-Revision: ([0-9a-f]{40})$/m)?.[1];
    assert.ok(previous, 'Site release tag is missing its content revision');
    if (previous !== content) level = Math.max(level, 1);
  }
  return bump(current, level);
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
  } else {
    assert.equal(command, 'plan');
    const parts = fs.readFileSync('deployment/deployments.yaml', 'utf8').split(/^---\s*$/m);
    for (const [component, name] of [['site', 'anyflow-blog'], ['comments', 'anyflow-blog-comments']]) {
      const doc = parts.find(part => new RegExp(`^metadata:\\n  name: ${name}$`, 'm').test(part));
      const version = doc?.match(/^    version: "([^"]+)"$/m)?.[1];
      console.log(`${component}=${plan(component, version, process.env.CONTENT_SHA)}`);
    }
  }
}
module.exports = { releaseLevel, bump, assertSubject };
