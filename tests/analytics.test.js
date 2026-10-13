const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/js/analytics.js'), 'utf8');
const site = require('../src/_data/site.json');
function fixture(hostname, existing = {}) {
  const added = [];
  const window = { ...existing.window };
  const document = {
    currentScript: { dataset: { measurementId: site.analyticsId, hostnames: site.analyticsHosts.join(',') } },
    querySelector: () => existing.tag || null,
    createElement: () => ({}),
    head: { append: node => added.push(node) },
  };
  const location = { hostname };
  const context = vm.createContext({ window, document, location });
  const run = () => vm.runInContext(source, context);
  run();
  return { window, document, location, added, run };
}
test('GA4 starts once on either production hostname with the existing measurement ID', () => {
  for (const host of ['anyflow.net', 'www.anyflow.net']) {
    const f = fixture(host);
    assert.equal(f.added.length, 1);
    assert.equal(f.added[0].async, true);
    assert.equal(f.added[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-YWPHXJFYET');
    assert.deepEqual(Array.from(f.window.dataLayer, args => args[0]), ['js', 'config']);
    assert.equal(f.window.dataLayer[1][1], site.analyticsId);
    f.run();
    assert.equal(f.added.length, 1);
    assert.equal(f.window.dataLayer.length, 2);
  }
});
test('preview hosts never load Google Analytics or create tracking state', () => {
  for (const host of ['localhost', '127.0.0.1', 'blog.anyflow.net', '192.168.0.10', 'anyflow.net.example.org']) {
    const f = fixture(host);
    assert.equal(f.added.length, 0);
    assert.equal(f.window.dataLayer, undefined);
    assert.equal(f.window.gtag, undefined);
  }
});
test('existing Google tag, GTM or Universal Analytics prevents another tracker', () => {
  for (const existing of [
    { window: { gtag() {} } },
    { window: { google_tag_manager: {} } },
    { window: { ga() {} } },
    { window: { GoogleAnalyticsObject: 'customAnalytics' } },
    { tag: { src: 'https://www.googletagmanager.com/gtm.js?id=GTM-OLD' } },
  ]) {
    const f = fixture('anyflow.net', existing);
    assert.equal(f.added.length, 0);
    assert.equal(f.window.dataLayer, undefined);
  }
});
test('missing or invalid configuration does not start analytics', () => {
  const f = fixture('localhost');
  f.location.hostname = 'anyflow.net';
  for (const dataset of [{}, { measurementId: 'UA-OLD', hostnames: 'anyflow.net' }, { measurementId: site.analyticsId }]) {
    f.document.currentScript.dataset = dataset;
    f.run();
  }
  f.document.currentScript = null;
  f.run();
  assert.equal(f.added.length, 0);
});
