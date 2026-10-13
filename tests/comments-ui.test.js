const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const {safeAuthorLink, commentRows, commentDate} = require('../src/js/comments');
const source = fs.readFileSync(require.resolve('../src/js/comments'), 'utf8');
function comment(id, parent_id = null, extra = {}) {
  return {id, parent_id, author: {name: '이름', link: '', is_admin: false}, body: '본문', created_at: '2026-10-13T01:00:00Z', status: 'published', likes: 0, liked: false, ...extra};
}
test('comment hierarchy keeps chronological siblings, actual parents and unlimited stored depth', () => {
  const rows = commentRows([comment('d','c'),comment('b','a'),comment('a'),comment('c','b'),comment('early',null,{created_at:'2026-01-01'}),comment('orphan','missing')]);
  assert.deepEqual(rows.map(row => row.comment.id), ['early','a','b','c','d','orphan']);
  assert.equal(rows[4].depth, 3);
  assert.deepEqual(rows[4].ancestors, ['a','b','c']);
  assert.equal(rows[1].replies, 1);
  assert.equal(commentRows([comment('a','b'),comment('b','a')]).length, 2);
});
test('author links allow only web or email URLs', () => {
  assert.equal(safeAuthorLink('https://example.com'), 'https://example.com/');
  assert.equal(safeAuthorLink('mailto:me@example.com'), 'mailto:me@example.com');
  for (const value of ['javascript:alert(1)', 'data:text/html,bad', '//example.com', 'broken']) assert.equal(safeAuthorLink(value), '');
});

test('legacy date without a timezone keeps the original wall clock', () => {
  assert.equal(commentDate('2008-01-15T08:34:00'),'2008-01-15 08:34:00');
  assert.equal(commentDate('2008-01-15'),'2008-01-15');
});

function fixture(initial) {
  let document, responses = [], requests = [];
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.attributes = {}; this.dataset = {}; this.style = {setProperty(){}}; this.value = ''; this._text = ''; this.disabled = false; }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    set innerHTML(_) { assert.fail('comments must never insert HTML'); }
    append(...nodes) { for (const node of nodes) { if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node),1); this.children.push(node); node.parentNode = this; } }
    replaceChildren(...nodes) { for (const node of this.children) node.parentNode = null; this.children = []; this.append(...nodes); }
    addEventListener(type, fn) { this.events[type] = fn; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    contains(node) { return this === node || this.children.some(child => child.contains(node)); }
    querySelector(selector) { return all(this).find(node => selector === 'input[type=checkbox]' ? node.tagName === 'input' && node.type === 'checkbox' : node.tagName === selector) || null; }
    focus() { document.activeElement = this; }
    setSelectionRange(start,end) { this.selectionStart = start; this.selectionEnd = end; }
    reportValidity() { return true; }
    scrollIntoView() {}
  }
  function all(node) { return node.children.flatMap(child => [child,...all(child)]); }
  const root = new Node('section'); root.dataset.postId = 'post-fixed'; root.append(new Node('h2'));
  document = {activeElement: null, querySelector: () => root, createElement: tag => new Node(tag), createTextNode: value => {const node = new Node('#text'); node.textContent = value; return node;}, getElementById: id => all(root).find(node => node.id === id)};
  responses.push(initial);
  const fetch = async (url, options) => {
    requests.push({url, options, body: options.body ? JSON.parse(options.body) : null});
    const result = responses.shift();
    if (result instanceof Error) throw result;
    return {ok: !result.error, json: async () => result};
  };
  vm.runInNewContext(source, {document, URL, fetch, crypto, confirm: () => true});
  const ready = async () => { await new Promise(resolve => setImmediate(resolve)); };
  return {root, document, requests, responses, ready, all: () => all(root), find: name => all(root).find(node => node.className === name)};
}
const snapshot = comments => ({comments,post_likes:0,post_liked:false,is_admin:false,moderation:false});
test('UI renders untrusted text safely and preserves composing state through likes and network failures', async () => {
  const malicious = comment('a',null,{author:{name:'<img onerror=bad>',link:'javascript:bad()'},body:'<script>bad()</script>',can_edit:true});
  const f = fixture(snapshot([malicious,comment('b','a',{status:'deleted'}),comment('c','b')]));
  await f.ready();
  assert.equal(f.find('comment-author').tagName, 'strong');
  assert.equal(f.find('comment-body').textContent, '<script>bad()</script>');
  assert.equal(f.all().filter(node => node.className === 'comment').length, 3);
  assert.ok(f.all().some(node => node.textContent === '삭제된 댓글입니다.'));
  const composer = f.find('comments-form'), body = composer.children.find(node => node.tagName === 'label').children[1];
  body.value = '작성 중인 댓글';
  body.focus(); body.setSelectionRange(2,4);
  f.responses.push({...snapshot([malicious]),post_likes:1,post_liked:true});
  f.find('comments-like').events.click();
  await f.ready();
  assert.equal(body.value, '작성 중인 댓글');
  assert.equal(f.find('comments-like').getAttribute('aria-pressed'),'true');
  f.responses.push(new Error('network'));
  composer.events.submit({preventDefault(){}});
  await f.ready();
  assert.equal(body.value,'작성 중인 댓글');
  const failed = f.requests.at(-1).body;
  f.responses.push({...snapshot([malicious]),comment_id:'new'});
  composer.events.submit({preventDefault(){}});
  await f.ready();
  assert.equal(f.requests.at(-1).body.request_id,failed.request_id);
  assert.equal(body.value,'');
  let finish;
  f.responses.push(new Promise(resolve => { finish = resolve; }));
  body.value = '전송할 댓글';
  composer.events.submit({preventDefault(){}});
  body.value = '전송 중 이어 쓴 다음 초안';
  finish({...snapshot([malicious]),comment_id:'next'});
  await f.ready();
  assert.equal(body.value,'전송 중 이어 쓴 다음 초안');
});
test('reply draft stays mounted through snapshot updates and folding protects its contents', async () => {
  const f = fixture(snapshot([comment('a'),comment('b','a')]));
  await f.ready();
  const reply = f.all().find(node => node.tagName === 'button' && node.textContent === '답글');
  reply.events.click();
  const forms = f.all().filter(node => node.className === 'comments-form');
  const draft = forms[1].children.find(node => node.tagName === 'label').children[1];
  draft.value = '답글 초안'; draft.focus(); draft.setSelectionRange(1,3);
  f.responses.push({...snapshot([comment('a'),comment('b','a')]),post_likes:1});
  f.find('comments-like').events.click(); await f.ready();
  assert.ok(f.root.contains(draft));
  assert.equal(draft.value,'답글 초안');
  const toggle = f.document.getElementById('comment-toggle-a');
  toggle.events.click();
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  assert.match(f.find('comments-notice').textContent,/작성 중인 답글/);
});
