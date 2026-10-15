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
  let document, responses = [], requests = [], timers = new Map(), timerId = 0;
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
    const result = await responses.shift();
    if (result instanceof Error) throw result;
    return {ok: !result.error, json: async () => result};
  };
  vm.runInNewContext(source, {document, URL, fetch, crypto, confirm: () => true, setTimeout: fn => {const id=++timerId; timers.set(id,fn); return id;}, clearTimeout: id => timers.delete(id)});
  const ready = async () => { await new Promise(resolve => setImmediate(resolve)); };
  return {root, document, requests, responses, ready, timers, tick: async () => {const [id,fn]=timers.entries().next().value || []; if(fn){timers.delete(id); await fn(); await ready();}}, all: () => all(root), find: name => all(root).find(node => node.className === name)};
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
  assert.equal(body.placeholder,'댓글 (댓글 수정·삭제는 작성한 브라우저에서 가능합니다. 쿠키가 지워지면 권한을 잃으며, Like도 같은 브라우저를 기준으로 처리합니다.)');
  assert.ok(!f.all().some(node => node.className === 'comments-help' && node.textContent.includes('쿠키가 지워지면')));
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

test('admin identity fields hide and disable in all editors and return after logout without losing visitor values',async()=>{
 const f=fixture(snapshot([comment('a',null,{can_edit:true})]));await f.ready();
 const form=f.find('comments-form'),identity=f.find('comments-identity');
 const name=identity.children[0].children[1],link=identity.children[1].children[1],body=form.children.find(n=>n.tagName==='label').children[1];
 name.value='방문자';link.value='https://visitor.example';
 f.responses.push({...snapshot([comment('a',null,{can_edit:true})]),is_admin:true});
 f.find('comments-like').events.click();await f.ready();
 assert.equal(identity.hidden,true);assert.equal(name.disabled,true);assert.equal(link.disabled,true);assert.equal(name.required,false);
 body.value='관리자 본문';
 f.responses.push({...snapshot([comment('a',null,{can_edit:true})]),is_admin:true});
 form.events.submit({preventDefault(){}});await f.ready();
 const request=f.requests.find(r=>r.options.method==='POST'&&r.url==='/api/comments');
 assert.equal(request.body.body,'관리자 본문');assert.equal('name' in request.body,false);assert.equal('link' in request.body,false);
 f.all().find(n=>n.tagName==='button'&&n.textContent==='수정').events.click();await f.ready();
 const edit=f.all().filter(n=>n.className==='comments-form')[1],editIdentity=edit.children.find(n=>n.className==='comments-identity');
 assert.equal(editIdentity.hidden,true);
 edit.children.find(n=>n.tagName==='label').children[1].value='원작성자 유지';
 f.responses.push({...snapshot([comment('a',null,{can_edit:true})]),is_admin:true});
 edit.events.submit({preventDefault(){}});await f.ready();
 const patch=f.requests.find(r=>r.options.method==='PATCH');assert.equal('name' in patch.body,false);assert.equal('link' in patch.body,false);
 f.responses.push({is_admin:false},snapshot([comment('a',null,{can_edit:true})]));
 f.all().find(n=>n.tagName==='button'&&n.textContent==='관리자 로그아웃').events.click();await f.ready();
 assert.equal(identity.hidden,false);assert.equal(name.disabled,false);assert.equal(link.disabled,false);assert.equal(name.required,true);
 assert.equal(name.value,'방문자');assert.equal(link.value,'https://visitor.example');
});


test('double Like sends both intents immediately and stale acknowledgements never revert the last selection', async () => {
  const f=fixture({...snapshot([]), revision: 1}); await f.ready();
  let first,second;
  f.responses.push(new Promise(resolve=>{first=resolve;}),new Promise(resolve=>{second=resolve;}));
  const like=f.find('comments-like');
  like.events.click();
  assert.equal(like.textContent,'❤️ 1'); assert.equal(like.disabled,false);
  like.events.click();
  assert.equal(like.textContent,'🩶 0');
  const sent=f.requests.filter(request=>request.url==='/api/likes');
  assert.equal(sent.length,2); assert.equal(sent[0].body.liked,true); assert.equal(sent[1].body.liked,false);
  assert.equal(sent[0].body.client_id,sent[1].body.client_id); assert.equal(sent[1].body.sequence,2);
  second({...snapshot([]),revision:3}); await f.ready();
  first({...snapshot([]),post_liked:true,post_likes:1,revision:2}); await f.ready();
  assert.equal(like.textContent,'🩶 0'); assert.equal(like.getAttribute('aria-pressed'),'false');
});

test('first Like acknowledgement retains the later unacknowledged intention', async () => {
  const f=fixture({...snapshot([]),revision:1});await f.ready();
  let first,second;
  f.responses.push(new Promise(resolve=>{first=resolve;}),new Promise(resolve=>{second=resolve;}));
  f.find('comments-like').events.click();f.find('comments-like').events.click();
  first({...snapshot([]),post_liked:true,post_likes:1,revision:2}); await f.ready();
  assert.equal(f.find('comments-like').textContent,'🩶 0');
  second({...snapshot([]),revision:3}); await f.ready();
  assert.equal(f.find('comments-like').textContent,'🩶 0');
});

test('create, edit and delete display before acceptance and a failed create retains its draft and request ID',async()=>{
  const existing=comment('a',null,{can_edit:true,can_delete:true,version:1});
  const f=fixture({...snapshot([existing]),revision:1});await f.ready();
  const composer=f.find('comments-form'),body=composer.children.find(n=>n.tagName==='label').children[1];
  body.value='새 댓글';let finish;
  f.responses.push(new Promise(resolve=>{finish=resolve;}));
  composer.events.submit({preventDefault(){}});
  assert.ok(f.all().some(n=>n.className==='comment-body'&&n.textContent==='새 댓글'));
  assert.ok(f.all().some(n=>n.className==='comment-badge'&&n.textContent==='저장 중'));
  assert.equal(f.find('comments-submit').disabled,true);
  const id=f.requests.at(-1).body.request_id;
  finish({error:true,message:'접수 실패'});await f.ready();
  assert.equal(body.value,'새 댓글');assert.ok(!f.all().some(n=>n.className==='comment-body'&&n.textContent==='새 댓글'));
  f.responses.push({...snapshot([existing,comment('new',null,{body:'새 댓글'})]),revision:2,comment_id:'new'});
  composer.events.submit({preventDefault(){}});await f.ready();
  assert.equal(f.requests.at(-1).body.request_id,id);assert.equal(body.value,'');
  f.all().find(n=>n.tagName==='button'&&n.textContent==='수정').events.click();
  const edit=f.all().filter(n=>n.className==='comments-form')[1];edit.children.find(n=>n.tagName==='label').children[1].value='수정된 본문';
  f.responses.push(new Promise(resolve=>{finish=resolve;}));edit.events.submit({preventDefault(){}});
  assert.equal(f.document.getElementById('comment-a').children.find(n=>n.className==='comment-body').textContent,'수정된 본문');
  assert.equal(f.requests.at(-1).body.expected_version,1);
  finish({...snapshot([comment('a',null,{body:'수정된 본문',can_edit:true,can_delete:true,version:2})]),revision:3});await f.ready();
  f.responses.push(new Promise(resolve=>{finish=resolve;}));
  f.all().find(n=>n.tagName==='button'&&n.textContent==='삭제').events.click();
  assert.equal(f.document.getElementById('comment-a'),undefined);
  assert.equal(f.requests.at(-1).body.expected_version,2);
  finish({...snapshot([]),revision:4});await f.ready();
});

test('queued task polling settles without permanent idle polling and failed task body is recoverable',async()=>{
  const task={id:'task',kind:'create',status:'queued',comment_id:'new',body:'보존할 본문'};
  const f=fixture({...snapshot([]),revision:1,tasks:[task]});await f.ready();
  assert.equal(f.timers.size,1);
  f.responses.push({...snapshot([]),revision:2,tasks:[{...task,status:'failed',message:'저장 충돌'}]});
  await f.tick();
  assert.equal(f.timers.size,0);assert.match(f.find('comments-notice').textContent,/저장 충돌/);
  f.all().find(n=>n.tagName==='button'&&n.textContent==='저장 실패한 댓글 내용 복원').events.click();
  const form=f.find('comments-form'),body=form.children.find(n=>n.tagName==='label').children[1];
  assert.equal(body.value,'보존할 본문');
});


test('a completed incoming comment polls briefly for PR publication and stops as soon as published',async()=>{
  const task={id:'done-create',kind:'create',status:'done',comment_id:'new'};
  const f=fixture({...snapshot([comment('new',null,{status:'pending'})]),revision:1,tasks:[task]});await f.ready();
  assert.equal(f.timers.size,1);assert.ok(f.all().some(n=>n.className==='comment-badge'&&n.textContent==='게시 처리 중'));
  f.responses.push({...snapshot([comment('new')]),revision:2,tasks:[task]});await f.tick();
  assert.equal(f.timers.size,0);assert.ok(!f.all().some(n=>n.className==='comment-badge'&&n.textContent==='게시 처리 중'));
});


test('late snapshots cannot undo login or restore administrator UI after logout',async()=>{
  const f=fixture({...snapshot([]),revision:1});await f.ready();
  let oldVisitor,oldAdmin;
  f.responses.push(new Promise(resolve=>{oldVisitor=resolve;}));
  f.find('comments-like').events.click();
  const login=f.find('comments-admin-login');
  login.children.find(n=>n.tagName==='label').children.find(n=>n.tagName==='input').value='test-only';
  f.responses.push({is_admin:true},{...snapshot([]),revision:2,is_admin:true});
  login.events.submit({preventDefault(){}});await f.ready();
  assert.equal(f.find('comments-identity').hidden,true);
  oldVisitor({...snapshot([]),revision:9});await f.ready();
  assert.equal(f.find('comments-identity').hidden,true);
  f.responses.push(new Promise(resolve=>{oldAdmin=resolve;}));
  f.find('comments-like').events.click();
  f.responses.push({is_admin:false},{...snapshot([]),revision:3,is_admin:false});
  f.all().find(n=>n.tagName==='button'&&n.textContent==='관리자 로그아웃').events.click();await f.ready();
  assert.equal(f.find('comments-identity').hidden,false);
  oldAdmin({...snapshot([]),revision:10,is_admin:true});await f.ready();
  assert.equal(f.find('comments-identity').hidden,false);
  assert.ok(f.find('comments-admin-login'));
});


test('a retried failed Like retains its ID and sequence without overwriting newer clicks',async()=>{
  const f=fixture({...snapshot([]),revision:1});await f.ready();
  f.responses.push(new Error('network'));f.find('comments-like').events.click();await f.ready();
  const original=f.requests.at(-1).body;let finish;
  f.responses.push(new Promise(resolve=>{finish=resolve;}));
  f.find('comments-retry').events.click();
  assert.equal(f.requests.at(-1).body.request_id,original.request_id);assert.equal(f.requests.at(-1).body.sequence,1);
  f.responses.push({...snapshot([]),revision:3,post_likes:1,post_liked:true},{...snapshot([]),revision:4});
  f.find('comments-like').events.click();f.find('comments-like').events.click();await f.ready();
  f.responses.push({...snapshot([]),revision:4});
  finish({...snapshot([]),revision:2,post_likes:1,post_liked:true});await f.ready();
  assert.equal(f.find('comments-like').textContent,'🩶 0');
  assert.equal(f.requests.filter(request=>request.url==='/api/likes').at(-1).body.sequence,3);
});


test('an initial background Git refresh polls fresh comments once and then stops',async()=>{
  const f=fixture({...snapshot([]),revision:1,refreshing:true});await f.ready();
  assert.equal(f.timers.size,1);
  f.responses.push({...snapshot([comment('fresh')]),revision:2,refreshing:false});await f.tick();
  assert.ok(f.document.getElementById('comment-fresh'));
  assert.equal(f.timers.size,0);
});
