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
const components = ['site', 'comments'];

function readRelease() {
  const release = JSON.parse(fs.readFileSync('release.json', 'utf8'));
  for (const component of components) {
    assert.match(release[component].version, versionPattern);
    assert.match(release[component].source, revisionPattern);
  }
  assert.match(release.site.content, revisionPattern);
  return release;
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
    const release = readRelease();
    const content = fs.readFileSync('content.lock', 'utf8').trim();
    assert.match(content, revisionPattern);
    console.log('content=' + content);
    for (const component of components) {
      const previous = release[component];
      git('merge-base', '--is-ancestor', previous.source, 'HEAD');
      const messages = git('log', '--no-merges', '--format=%s%n%b', previous.source + '..HEAD');
      const changed = component === 'site' && previous.content !== content;
      console.log(component + '=' + nextVersion(previous.version, messages, changed));
    }
  } else {
    assert.equal(command, 'record');
    const release = readRelease();
    const { SOURCE_SHA, CONTENT_SHA, SITE_VERSION, COMMENTS_VERSION } = process.env;
    assert.match(SOURCE_SHA, revisionPattern);
    assert.match(CONTENT_SHA, revisionPattern);
    for (const [component, version] of [['site', SITE_VERSION], ['comments', COMMENTS_VERSION]]) {
      if (!version) continue;
      assert.match(version, versionPattern);
      release[component] = { version, source: SOURCE_SHA };
      if (component === 'site') release.site.content = CONTENT_SHA;
    }
    fs.writeFileSync('release.json', JSON.stringify(release, null, 2) + '\n');
  }
}
module.exports = { releaseLevel, bump, assertSubject, nextVersion };
