const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const {safeAuthorLink, commentRows, commentDate} = require('../src/js/comments');
const source = fs.readFileSync(require.resolve('../src/js/comments'), 'utf8');
function comment(id, parent_id = null, extra = {}) {
  return {id, parent_id, author: {name: '이름', link: '', is_admin: false}, body: '본문', created_at: '2026-10-13T01:00:00Z', status: 'published', likes: 0, liked: false, ...extra};
}
test('comment hierarchy keeps newest roots, actual parents and unlimited stored depth', () => {
  const rows = commentRows([comment('d','c'),comment('b','a'),comment('a'),comment('c','b'),comment('early',null,{created_at:'2026-01-01'}),comment('orphan','missing')]);
  assert.deepEqual(rows.map(row => row.comment.id), ['a','b','c','d','orphan','early']);
  assert.equal(rows.find(row => row.comment.id === 'd').depth, 3);
  assert.deepEqual(rows.find(row => row.comment.id === 'd').ancestors, ['a','b','c']);
  assert.equal(rows.find(row => row.comment.id === 'a').replies, 1);
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
  assert.equal(commentDate(null),'작성일 미상');
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
  f.document.getElementById('comment-toggle-a').events.click();
  assert.equal(f.all().filter(node => node.className === 'comment').length, 2);
  assert.ok(!f.all().some(node => node.textContent.includes('삭제된 댓글')));
  assert.ok(f.document.getElementById('comment-c'));
  const composer = f.find('comments-form'), body = composer.children.find(node => node.tagName === 'label').children[1];
  assert.equal(composer.children[0].children[1],body);
  assert.equal(body.placeholder,'댓글');
  assert.deepEqual(composer.children[1].children.map(label => label.children[1].placeholder),['이름','이메일 또는 홈페이지 (선택)']);
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
  f.responses.push(snapshot([comment('a',null,{status:'deleted'}),comment('b','a')]));
  f.find('comments-like').events.click(); await f.ready();
  assert.ok(f.root.contains(draft));
  assert.equal(draft.value,'답글 초안');
  assert.equal(f.document.getElementById('comment-a'),undefined);
  assert.ok(f.document.getElementById('comment-b'));
});

test('post and comment Likes show a heart emoji and count, retaining accessible names', async () => {
  const f = fixture({...snapshot([comment('a',null,{likes:1}),comment('b')]),post_likes:7});
  await f.ready();
  const likes = f.all().filter(node => node.className === 'comments-like');
  assert.deepEqual(likes.map(node => node.textContent), ['❤️ 7','❤️ 1','🩶 0']);
  assert.deepEqual(likes.map(node => node.getAttribute('aria-label')), ['이 글 좋아요 7','댓글 좋아요 1','댓글 좋아요 0']);
});

test('deleted rows disappear while replies attach to the closest visible ancestor', () => {
  const rows = commentRows([comment('a'),comment('b','a',{status:'deleted'}),comment('c','b'),comment('d','c'),comment('gone',null,{status:'deleted'}),comment('child','gone')]);
  assert.deepEqual(rows.map(row => row.comment.id), ['a','c','d','child']);
  assert.equal(rows[1].depth,1);
  assert.deepEqual(rows[1].ancestors,['a']);
  assert.equal(rows[3].depth,0);
  assert.equal(commentRows([comment('gone',null,{status:'deleted'})]).length,0);
  assert.equal(commentRows([comment('x','y',{status:'deleted'}),comment('y','x',{status:'deleted'}),comment('child','x')]).length,1);
});

test('newest top-level comments precede older threads while replies stay chronological', () => {
  const rows = commentRows([
    comment('old',null,{created_at:'2025-01-01'}),comment('new',null,{created_at:'2026-01-01'}),comment('unknown',null,{created_at:null}),
    comment('later','new',{created_at:'2026-03-01'}),comment('earlier','new',{created_at:'2026-02-01'}),
    comment('nested','earlier',{created_at:'2026-04-01'}),comment('undated-reply','new',{created_at:null})
  ]);
  assert.deepEqual(rows.map(row => row.comment.id), ['new','earlier','nested','later','undated-reply','old','unknown']);
});

test('replies start collapsed and expansion persists through Like updates', async () => {
  const comments=[comment('a'),comment('b','a'),comment('c','b')];
  const f=fixture(snapshot(comments)); await f.ready();
  assert.equal(f.find('comments-like').textContent,'🩶 0');
  assert.equal(f.document.getElementById('comment-toggle-a').getAttribute('aria-expanded'),'false');
  assert.equal(f.document.getElementById('comment-toggle-a').textContent,'답글 1개');
  assert.equal(f.document.getElementById('comment-b'),undefined);
  f.document.getElementById('comment-toggle-a').events.click();
  assert.ok(f.document.getElementById('comment-b'));
  assert.equal(f.document.getElementById('comment-c'),undefined);
  f.document.getElementById('comment-toggle-b').events.click();
  assert.ok(f.document.getElementById('comment-c'));
  f.responses.push({...snapshot(comments),post_likes:1,post_liked:true});
  f.find('comments-like').events.click(); await f.ready();
  assert.equal(f.find('comments-like').textContent,'❤️ 1');
  assert.ok(f.document.getElementById('comment-c'));
  f.responses.push(snapshot(comments));
  f.find('comments-like').events.click(); await f.ready();
  assert.equal(f.find('comments-like').textContent,'🩶 0');
  f.document.getElementById('comment-toggle-a').events.click();
  assert.equal(f.document.getElementById('comment-b'),undefined);
});
