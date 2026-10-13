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
