'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const {GitStore}=require('../lib/comments/git-store');
const {exportPublic}=require('../lib/comments/export');
const git=async(directory,...args)=>(await run('git',args,{cwd:directory})).stdout.trim();
const comment=(id,status='published')=>({id,post_id:'post_1',parent_id:null,author:{name:'이름',link:'https://example.com',is_admin:false},body:'본문',created_at:'2026-10-13T00:00:00Z',updated_at:null,status,owner_hash:'PRIVATE_OWNER_HASH',request_fingerprint:'PRIVATE_FINGERPRINT'});
async function temporary(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'comments-git-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));return directory;}

test('preview persists concurrent Like updates, exports only public fields and rolls back failed mutations',async t=>{
  const root=await temporary(t),directory=path.join(root,'data'),store=new GitStore({directory,preview:true});
  await store.transaction(state=>{state.comments.c1=comment('c1');state.comments.c2=comment('c2','pending');return 'saved';});
  await Promise.all(Array.from({length:8},(_,i)=>store.transaction(state=>{state.likes['post:post_1']??={};state.likes['post:post_1']['HASH_'+i]=true;})));
  assert.equal(Object.keys((await store.read()).likes['post:post_1']).length,8);
  const published=JSON.parse(await fs.readFile(path.join(directory,'public/post_1.json'),'utf8'));
  assert.deepEqual(published.comments.map(c=>c.id),['c1']);
  assert.equal(published.post_likes,8);
  assert.doesNotMatch(JSON.stringify(published),/PRIVATE_|HASH_|moderation|owner_hash|request_fingerprint|can_edit/);
  const revision=await git(directory,'rev-parse','HEAD');
  await assert.rejects(store.transaction(state=>{state.comments.c1.body='LOST';throw new Error('validation failed');}),/validation failed/);
  assert.equal((await store.read()).comments.c1.body,'본문');
  assert.equal(await git(directory,'rev-parse','HEAD'),revision);
});

test('review writes an isolated incoming branch, pending edits stay isolated and retries do not duplicate requests',async t=>{
  const root=await temporary(t),remote=path.join(root,'remote.git'),directory=path.join(root,'data');
  await fs.mkdir(remote);await git(remote,'init','--bare','--initial-branch=main');
  const store=new GitStore({directory,remote});
  await store.transaction(state=>{state.comments.c1=comment('c1');},{review:true,commentId:'c1',postTitle:'글',postUrl:'https://example.com/post/'});
  assert.equal((await store.read()).comments.c1.status,'pending');
  await assert.rejects(git(remote,'show','main:comments/c1.json'));
  assert.equal(JSON.parse(await git(remote,'show','incoming/c1:comments/c1.json')).status,'published');
  const head=await git(remote,'rev-parse','incoming/c1');
  await store.transaction(state=>{if(!state.comments.c1)state.comments.c1=comment('c1');},{review:true,commentId:'c1'});
  assert.equal(await git(remote,'rev-parse','incoming/c1'),head);
  await store.transaction(state=>{state.comments.c1.body='수정';},{commentId:'c1'});
  assert.equal(JSON.parse(await git(remote,'show','incoming/c1:comments/c1.json')).body,'수정');
  await assert.rejects(git(remote,'show','main:comments/c1.json'));
  await store.transaction(state=>{state.likes['post:post_1']={ACTOR:true};});
  assert.ok(await git(remote,'ls-tree','-r','--name-only','main','likes'));
  assert.equal((await store.read()).comments.c1.body,'수정');
});

test('merged review requests are approved by exporter and deleted parents keep their children',async t=>{
  const root=await temporary(t),store=new GitStore({directory:root,preview:true});
  await store.transaction(state=>{state.comments.parent=comment('parent','pending');state.comments.child={...comment('child'),parent_id:'parent'};});
  await fs.mkdir(path.join(root,'requests'));
  await fs.writeFile(path.join(root,'requests/parent.json'),JSON.stringify({comment_id:'parent'}));
  await exportPublic(root,{approveMerged:true});
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'comments/parent.json'))).status,'published');
  await git(root,'add','--all');await git(root,'-c','user.name=Test','-c','user.email=test@example.com','commit','-m','Approved fixture');
  await store.transaction(state=>{state.comments.parent.status='deleted';});
  const data=JSON.parse(await fs.readFile(path.join(root,'public/post_1.json')));
  assert.equal(data.comments.find(c=>c.id==='parent').body,'삭제된 댓글입니다');
  assert.equal(data.comments.find(c=>c.id==='child').parent_id,'parent');
  assert.doesNotMatch(JSON.stringify(data),/PRIVATE_/);
});


test('unmerged deleted requests never appear in anonymous public data',async t=>{
  const {publicPost}=require('../lib/comments/model');
  const root=await temporary(t),remote=path.join(root,'remote.git'),directory=path.join(root,'data');
  await fs.mkdir(remote);await git(remote,'init','--bare','--initial-branch=main');
  const store=new GitStore({directory,remote});
  await store.transaction(state=>{state.comments.private_deleted=comment('private_deleted','pending');},{review:true,commentId:'private_deleted'});
  await store.transaction(state=>{state.comments.private_deleted.status='deleted';state.comments.private_deleted.body='';},{commentId:'private_deleted'});
  const state=await store.read();
  assert.equal(state.comments.private_deleted._unmerged,true);
  assert.equal(state.comments.private_deleted.status,'deleted');
  assert.deepEqual(publicPost(state,'post_1').comments,[]);
  assert.doesNotMatch(await git(remote,'show','incoming/private_deleted:comments/private_deleted.json'),/_unmerged/);
});


test('remote push conflicts replay the transaction without losing another writer Like',async t=>{
  const root=await temporary(t),remote=path.join(root,'remote.git');
  await fs.mkdir(remote);await git(remote,'init','--bare','--initial-branch=main');
  const first=new GitStore({directory:path.join(root,'first'),remote}),second=new GitStore({directory:path.join(root,'second'),remote});
  await first.read();await second.read();
  const push=first.pushMain.bind(first);let concurrent=false;
  first.pushMain=async()=>{if(!concurrent){concurrent=true;await second.transaction(state=>{state.likes['post:post_1']={OTHER:true};});}return push();};
  await first.transaction(state=>{state.likes['post:post_1']??={};state.likes['post:post_1'].FIRST=true;});
  assert.deepEqual((await first.read()).likes['post:post_1'],{OTHER:true,FIRST:true});
  await assert.rejects(new GitStore({directory:path.join(root,'no-origin')}).read(),/origin/);
});


test('reused container PID releases an old process lock while same-process stores share one identity',async t=>{
  const root=await temporary(t),directory=path.join(root,'data'),lock=directory+'.lock';
  const first=new GitStore({directory,preview:true}),second=new GitStore({directory,preview:true});
  await first.read();
  await fs.mkdir(lock);
  await fs.writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,processId:'previous-container-process'}));
  const expired=Date.now()+5001;t.mock.method(Date,'now',()=>expired);
  await first.read();
  await assert.rejects(fs.access(lock));
  let owner,pending,entered=false;
  await first.locked(async()=>{
    owner=JSON.parse(await fs.readFile(path.join(lock,'owner.json')));
    assert.notEqual(owner.processId,'previous-container-process');
    pending=second.locked(async()=>{
      entered=true;
      assert.equal(JSON.parse(await fs.readFile(path.join(lock,'owner.json'))).processId,owner.processId);
    });
    await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal(entered,false);
    assert.equal(JSON.parse(await fs.readFile(path.join(lock,'owner.json'))).processId,owner.processId);
  });
  await pending;
  assert.equal(entered,true);
});


test('delayed concurrent reads share one refresh, cache for five seconds and isolate caller permissions',async t=>{
  const {publicPost}=require('../lib/comments/model');
  const root=await temporary(t),store=new GitStore({directory:root,preview:true});
  await store.transaction(state=>{state.comments.c1=comment('c1');state.comments.c2=comment('c2','pending');});
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  const refresh=store.refresh.bind(store);let calls=0,release,enter;
  const gate=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{enter=resolve;});
  store.refresh=async()=>{calls++;await refresh();if(calls===1){enter();await gate;}};
  const pending=Array.from({length:20},()=>store.read());
  await entered;assert.equal(calls,1);release();
  const states=await Promise.all(pending);assert.equal(calls,1);
  assert.notEqual(states[0],states[1]);assert.notEqual(states[0].comments.c1,states[1].comments.c1);
  states[0].comments.c1.body='caller-local';
  assert.equal((await store.read()).comments.c1.body,'본문');assert.equal(calls,1);
  const owner=publicPost(states[1],'post_1','PRIVATE_OWNER_HASH'),anonymous=publicPost(states[2],'post_1');
  assert.equal(owner.comments.length,2);assert.equal(owner.comments[0].can_edit,true);
  assert.equal(anonymous.comments.length,1);assert.equal(anonymous.comments[0].can_edit,false);
  now+=4999;await store.read();assert.equal(calls,1);
  now+=1;await store.read();assert.equal(calls,2);
});

test('writes refresh independently of the read cache and invalidate it after success or failure',async t=>{
  const root=await temporary(t),first=new GitStore({directory:root,preview:true}),second=new GitStore({directory:root,preview:true});
  await first.transaction(state=>{state.comments.c1=comment('c1');});
  await first.read();
  await second.transaction(state=>{state.comments.c1.body='external edit';state.likes['post:post_1']={OTHER:true};});
  assert.equal((await first.read()).comments.c1.body,'본문');
  await first.transaction(state=>{
    assert.equal(state.comments.c1.body,'external edit');assert.deepEqual(state.likes['post:post_1'],{OTHER:true});
    state.comments.c1.body='local edit';
  });
  assert.equal((await first.read()).comments.c1.body,'local edit');
  await second.transaction(state=>{state.comments.c1.body='new external edit';});
  await assert.rejects(first.transaction(state=>{
    assert.equal(state.comments.c1.body,'new external edit');throw new Error('rejected write');
  }),/rejected write/);
  assert.equal((await first.read()).comments.c1.body,'new external edit');
});

test('expired cache never substitutes for a failed refresh and concurrent failures can be retried',async t=>{
  const root=await temporary(t),store=new GitStore({directory:root,preview:true});
  await store.transaction(state=>{state.comments.c1=comment('c1');});
  await store.read();
  const expired=Date.now()+5001;t.mock.method(Date,'now',()=>expired);
  const refresh=store.refresh.bind(store);let calls=0;
  store.refresh=async()=>{calls++;throw new Error('remote unavailable');};
  const failures=await Promise.allSettled(Array.from({length:10},()=>store.read()));
  assert.equal(calls,1);assert.ok(failures.every(r=>r.status==='rejected'&&/remote unavailable/.test(r.reason.message)));
  store.refresh=async()=>{calls++;await refresh();};
  assert.equal((await store.read()).comments.c1.body,'본문');assert.equal(calls,2);
});


test('Git maintenance stays in the foreground instead of leaving detached workers under Node PID 1',async t=>{
  const root=await temporary(t),remote=path.join(root,'remote.git'),directory=path.join(root,'data'),trace=path.join(root,'trace.json');
  await fs.mkdir(remote);await git(remote,'init','--bare','--initial-branch=main');
  const store=new GitStore({directory,remote});await store.read();
  assert.equal(await store.git('config','--bool','--get','maintenance.autoDetach'),'false');
  assert.equal(await store.git('config','--bool','--get','gc.autoDetach'),'false');
  const previous=process.env.GIT_TRACE2_EVENT;process.env.GIT_TRACE2_EVENT=trace;
  try{await store.git('fetch','origin');}
  finally{if(previous===undefined)delete process.env.GIT_TRACE2_EVENT;else process.env.GIT_TRACE2_EVENT=previous;}
  const events=(await fs.readFile(trace,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.ok(events.some(e=>e.event==='child_start'&&e.argv?.[1]==='maintenance'));
  assert.ok(!events.some(e=>e.event==='region_enter'&&e.category==='maintenance'&&e.label==='detach'));
});

test('root and path-based post Likes persist without blocking later replies',async t=>{
 const root=await temporary(t),store=new GitStore({directory:path.join(root,'data'),preview:true});
 await store.transaction(state=>{state.comments.parent={...comment('parent'),post_id:'/'};state.likes['post:/']={actor:true};state.likes['post:/sw-engineer/activescale']={actor:true};});
 await store.transaction(state=>{state.comments.reply={...comment('reply'),post_id:'/',parent_id:'parent'};});
 const saved=await store.read();assert.equal(saved.comments.reply.parent_id,'parent');assert.equal(saved.likes['post:/'].actor,true);assert.equal(saved.likes['post:/sw-engineer/activescale'].actor,true);
 for(const invalid of ['post:/../escape','comment:/invalid','invalid:/'])await assert.rejects(store.transaction(state=>{state.likes[invalid]={actor:true};}),/Like 대상/);
});
