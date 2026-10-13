const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createCommentsHandler}=require('../lib/comments/api');
const {publicPost}=require('../lib/comments/model');
const secret='s'.repeat(64),adminToken='a'.repeat(64),origin='http://127.0.0.1:8765';
function memory(initial={settings:{moderation:false,legacyLikes:{}},comments:{},likes:{}}){
  let state=structuredClone(initial),queue=Promise.resolve();const operations=[];
  return {operations,read:async()=>structuredClone(state),transaction(fn,options={}){const next=queue.then(async()=>{const draft=structuredClone(state),result=await fn(draft);state=draft;operations.push(options);return result;});queue=next.catch(()=>{});return next;}};
}
async function fixture(t,initial){
  const store=memory(initial),handler=createCommentsHandler({store,catalog:[{id:'first',title:'First',url:'/first/'},{id:'second',title:'Second',url:'/second/'}],secret,adminToken,origins:[origin],adminName:'관리자'});
  const server=http.createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  function browser(){let cookie='';return {get cookie(){return cookie;},async request(method,path,data,headers={}){
    const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
    const values=new Map(cookie.split('; ').filter(Boolean).map(pair=>pair.split('=')));
    for(const set of response.headers.getSetCookie()){const pair=set.split(';')[0],i=pair.indexOf('=');values.set(pair.slice(0,i),pair.slice(i+1));}
    cookie=[...values].map(([k,v])=>`${k}=${v}`).join('; ');const raw=await response.text();return {status:response.status,data:raw?JSON.parse(raw):null,headers:response.headers};
  }};}
  return {store,browser};
}
const input=(request='request-123')=>({post_id:'first',request_id:request,name:'작성자',link:'person@example.net',body:'첫 댓글\n둘째 줄'});
test('comment ownership, safe public projection, replies and deleted parents',async t=>{
  const {browser,store}=await fixture(t),author=browser(),stranger=browser(),admin=browser();
  const created=await author.request('POST','/api/comments',input());assert.equal(created.status,201);const key=created.data.comment_id;
  assert.equal(created.data.comments[0].author.link,'mailto:person@example.net');assert.equal(created.data.comments[0].can_edit,true);assert.equal(store.operations[0].review,true);
  assert.match(created.headers.getSetCookie()[0],/HttpOnly; SameSite=Lax/);assert.doesNotMatch(created.headers.getSetCookie()[0],/; Secure/);
  assert.doesNotMatch(JSON.stringify(created.data),/owner_hash|request_fingerprint|legacyLikes/);
  const publicView=await stranger.request('GET','/api/comments?post=first');assert.equal(publicView.data.comments[0].can_edit,false);
  assert.equal((await stranger.request('PATCH',`/api/comments/${key}`,{post_id:'first',body:'침입'})).status,403);
  assert.equal((await stranger.request('DELETE',`/api/comments/${key}`,{post_id:'first'})).status,403);
  assert.equal((await author.request('PATCH',`/api/comments/${key}`,{post_id:'second',body:'wrong'})).status,404);
  const edited=await author.request('PATCH',`/api/comments/${key}`,{post_id:'first',body:'수정',name:'수정 이름'});assert.equal(edited.data.comments[0].body,'수정');
  const reply=await stranger.request('POST','/api/comments',{...input('reply-123'),parent_id:key});assert.equal(reply.status,201);assert.equal(reply.data.comments[1].parent_id,key);
  const deleted=await author.request('DELETE',`/api/comments/${key}`,{post_id:'first'});assert.equal(deleted.data.comments[0].status,'deleted');assert.equal(deleted.data.comments[0].body,'삭제된 댓글입니다');assert.equal(deleted.data.comments.length,2);
  assert.equal((await author.request('DELETE',`/api/comments/${key}`,{post_id:'first'})).status,200);
  assert.equal((await author.request('PATCH',`/api/comments/${key}`,{post_id:'first',body:'復活'})).status,409);
  assert.equal((await admin.request('POST','/api/admin/login',{token:adminToken})).status,200);
  const adminEdit=await admin.request('PATCH',`/api/comments/${reply.data.comment_id}`,{post_id:'first',body:'관리자 수정'});assert.equal(adminEdit.status,200);assert.equal(adminEdit.data.is_admin,true);
});
test('request retries and concurrent desired-state likes never duplicate records',async t=>{
  const {browser,store}=await fixture(t),one=browser(),two=browser();
  await one.request('GET','/api/comments?post=first');await two.request('GET','/api/comments?post=first');
  const created=await Promise.all(Array.from({length:6},()=>one.request('POST','/api/comments',input())));assert.ok(created.every(r=>r.status===201));assert.equal((await store.read()).comments&&Object.keys((await store.read()).comments).length,1);
  assert.equal((await one.request('POST','/api/comments',{...input(),body:'다른 본문'})).status,409);
  await Promise.all(Array.from({length:6},()=>one.request('PUT','/api/likes',{post_id:'first',comment_id:null,liked:true})));
  let current=await one.request('GET','/api/comments?post=first');assert.equal(current.data.post_likes,1);assert.equal(current.data.post_liked,true);
  await two.request('PUT','/api/likes',{post_id:'first',comment_id:null,liked:true});current=await one.request('GET','/api/comments?post=first');assert.equal(current.data.post_likes,2);
  await one.request('PUT','/api/likes',{post_id:'first',liked:false});current=await one.request('GET','/api/comments?post=first');assert.equal(current.data.post_likes,1);assert.equal(current.data.post_liked,false);
  const key=created[0].data.comment_id;const liked=await one.request('PUT','/api/likes',{post_id:'first',comment_id:key,liked:true});assert.equal(liked.data.comments[0].likes,1);
  const serialized=JSON.stringify(await store.read());for(const pair of one.cookie.split('; '))assert.ok(!serialized.includes(pair.split('=')[1]));
});
test('moderation is administrator-only, pending comments stay private and imported ownership is not guessed',async t=>{
  const initial={settings:{moderation:true,legacyLikes:{'post:first':3}},comments:{old:{id:'old',post_id:'first',parent_id:null,author:{name:'이전',link:'javascript:alert(1)',is_admin:false},body:'이전 댓글',created_at:'2020-01-01T00:00:00Z',status:'published',owner_hash:null,legacy:true,source:{provider:'disqus',private_email:'secret'}}},likes:{}};
  const {browser}=await fixture(t,initial),author=browser(),admin=browser();
  const pending=await author.request('POST','/api/comments',input());assert.equal(pending.data.pending,true);assert.equal(pending.data.comments.length,2);assert.equal(pending.data.post_likes,3);
  assert.equal(pending.data.comments[0].legacy,true);assert.equal(pending.data.comments[0].source,'disqus');assert.equal(pending.data.comments[0].author.link,'');assert.doesNotMatch(JSON.stringify(pending.data),/private_email|secret/);
  assert.equal((await author.request('PATCH','/api/comments/old',{post_id:'first',body:'same name'})).status,403);
  assert.equal((await author.request('PUT','/api/admin/settings',{moderation:false})).status,401);
  assert.equal((await admin.request('POST','/api/admin/login',{token:'wrong'})).status,401);
  await admin.request('POST','/api/admin/login',{token:adminToken});let current=await admin.request('GET','/api/comments?post=first');assert.equal(current.data.comments.length,2);assert.equal(current.data.comments[1].status,'pending');
  assert.equal((await author.request('POST','/api/comments',{...input('reply-pending'),parent_id:pending.data.comment_id})).status,409);
  assert.equal((await author.request('PUT','/api/likes',{post_id:'first',comment_id:pending.data.comment_id,liked:true})).status,409);
  current=await admin.request('POST',`/api/admin/comments/${pending.data.comment_id}/approve`,{post_id:'first'});assert.equal(current.data.comments[1].status,'published');
  assert.equal((await author.request('GET','/api/comments?post=first')).data.comments.length,2);
  assert.equal((await admin.request('PATCH','/api/comments/old',{post_id:'first',body:'복원 수정'})).status,200);
  await admin.request('PUT','/api/admin/settings',{moderation:false});await admin.request('DELETE','/api/admin/session',{});assert.equal((await admin.request('PUT','/api/admin/settings',{moderation:true})).status,401);
  assert.equal((await author.request('POST','/api/comments',input('without-approval'))).data.pending,false);
});
test('trust boundaries reject origin, content type, malformed inputs and cross-post parents',async t=>{
  const {browser,store}=await fixture(t),one=browser();
  assert.equal((await one.request('POST','/api/comments',input(),{Origin:'https://hostile.example'})).status,403);
  assert.equal((await one.request('POST','/api/comments',input(),{'Content-Type':'text/plain'})).status,415);
  assert.equal((await one.request('POST','/api/comments',{...input(),body:'x'.repeat(65537)})).status,413);
  for(const change of [{post_id:'missing'},{post_id:'../first'},{request_id:'short'},{name:''},{body:''},{body:'x'.repeat(10001)},{link:'javascript:alert(1)'},{link:'mailto:a@example.com?subject=injection'},{link:'https://user:pass@example.com/'},{owner_hash:'forged'}]){
    const response=await one.request('POST','/api/comments',{...input(),...change});assert.ok(response.status>=400&&response.status<500,JSON.stringify(change));
  }
  const first=await one.request('POST','/api/comments',input());assert.equal((await one.request('POST','/api/comments',{...input('wrong-parent'),post_id:'second',parent_id:first.data.comment_id})).status,404);
  assert.equal((await one.request('PUT','/api/likes',{post_id:'first',liked:'true'})).status,400);
  assert.equal(Object.keys((await store.read()).comments).length,1);
});
test('visitor cookie is Secure outside localhost and forged administrator cookie gives no authority',async t=>{
  const store=memory(),handler=createCommentsHandler({store,catalog:[{id:'first'}],secret,adminToken,origins:['https://blog.anyflow.net']});
  const req={method:'GET',url:'/api/comments?post=first',headers:{host:'blog.anyflow.net',cookie:'anyflow_admin=forged'}};const headers={};let body,status;
  const res={getHeader:k=>headers[k],setHeader:(k,v)=>{headers[k]=v;},writeHead:(s,h)=>{status=s;Object.assign(headers,h);},end:value=>{body=value;}};
  await handler(req,res);assert.equal(status,200);assert.match(headers['Set-Cookie'][0],/; Secure/);assert.equal(JSON.parse(body).is_admin,false);
  assert.equal(await handler({...req,url:'/ordinary-page/'},res),false);
  assert.throws(()=>createCommentsHandler({store,catalog:[],secret:'short',adminToken,origins:[origin]}),/secrets/);
  const state={settings:{},comments:{pending:{id:'pending',post_id:'first',status:'pending',owner_hash:'PRIVATE',body:'SECRET'}},likes:{'post:first':{PRIVATE:true}}};assert.doesNotMatch(JSON.stringify(publicPost(state,'first')),/PRIVATE|SECRET|pending/);
});
test('pending comments remain visible and editable only to their owner and administrator',async t=>{
  const {browser}=await fixture(t,{settings:{moderation:true},comments:{},likes:{}}),owner=browser(),stranger=browser();
  const created=await owner.request('POST','/api/comments',input('private-pending'));const key=created.data.comment_id;
  assert.equal(created.data.pending,true);assert.equal(created.data.comments.length,1);assert.equal(created.data.comments[0].status,'pending');assert.equal(created.data.comments[0].can_edit,true);assert.equal(created.data.comments[0].can_delete,true);
  assert.equal((await stranger.request('GET','/api/comments?post=first')).data.comments.length,0);
  const edited=await owner.request('PATCH',`/api/comments/${key}`,{post_id:'first',body:'대기 중 수정'});assert.equal(edited.status,200);assert.equal(edited.data.comments[0].body,'대기 중 수정');
  assert.equal((await stranger.request('PATCH',`/api/comments/${key}`,{post_id:'first',body:'타인 수정'})).status,403);
  const admin=browser();await admin.request('POST','/api/admin/login',{token:adminToken});assert.equal((await admin.request('GET','/api/comments?post=first')).data.comments.length,1);
});
test('unmerged deleted comments never enter anonymous API snapshots or public exports',()=>{
  const state={settings:{},comments:{draft:{id:'draft',post_id:'first',parent_id:null,author:{name:'소유자'},body:'비공개 본문',created_at:'2026-10-13T00:00:00Z',status:'deleted',owner_hash:'owner',_unmerged:true}},likes:{}};
  assert.equal(publicPost(state,'first').comments.length,0);assert.equal(publicPost(state,'first','stranger').comments.length,0);
  assert.equal(publicPost(state,'first','owner').comments[0].body,'삭제된 댓글입니다');assert.equal(publicPost(state,'first',null,true).comments.length,1);
  assert.doesNotMatch(JSON.stringify(publicPost(state,'first','owner')),/_unmerged|owner_hash/);
  delete state.comments.draft._unmerged;assert.equal(publicPost(state,'first').comments[0].status,'deleted');
});
