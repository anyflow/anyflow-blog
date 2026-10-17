'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {execFile,spawn}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile),{QueueStore}=require('../lib/comments/queue-store'),{GitStore}=require('../lib/comments/git-store');
const {publicPost,fingerprint,commentVersion}=require('../lib/comments/model');
const actor={actorHash:'owner',isAdmin:false};
const empty=()=>({settings:{moderation:false,legacyLikes:{}},comments:{},likes:{}});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function operation(kind,id,values={}){const op={id,requestId:id,kind,actor,post:'post_1',commentId:null,time:'2026-10-15T00:00:00.000Z',...values};op.fingerprint=fingerprint(op);return op;}
function create(id='create-123',commentId='c1',extra={}){return operation('create',id,{commentId,parent:null,author:{name:'Owner',link:'',is_admin:false},body:'Original',requestFingerprint:fingerprint({id}),...extra});}
function memory({preview=true}={}){let state=empty();return {preview,calls:0,async read(){return structuredClone(state);},async transaction(fn){this.calls++;if(this.gate)await this.gate.promise;if(this.offline)throw new Error('offline');const next=structuredClone(state),result=await fn(next);state=next;return result;}};}
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'comments-queue-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
async function queue(t,store,root){const q=await new QueueStore({store,directory:path.join(root||await temporary(t),'queue'),retryMs:20,refreshMs:60000}).open();t.after(()=>q.close());return q;}
async function until(fn){for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Timed out waiting for queue');}
async function settled(q){await until(()=>!q.record.jobs.length&&!q.active);}
const git=async(directory,...args)=>(await run('git',args,{cwd:directory})).stdout.trim();

test('acceptance and reads never wait for Git; later Like intent is queued and batched',async t=>{
 const store=memory(),q=await queue(t,store);await until(()=>!q.active);store.gate=deferred();
 await q.enqueue(operation('like','like-on',{liked:true,clientId:'tab',sequence:1}));await until(()=>store.calls===1);
 const start=performance.now();await q.enqueue(operation('like','like-off',{liked:false,clientId:'tab',sequence:2}));await q.enqueue(operation('like','other-like',{liked:true,actor:{actorHash:'other',isAdmin:false}}));
 const view=await q.view(actor,'post_1');assert.equal(view.state.likes['post:post_1'].owner,undefined);assert.equal(view.state.likes['post:post_1'].other,true);assert.ok(performance.now()-start<500,'disk acceptance unexpectedly waited for blocked Git');
 assert.equal(store.calls,1);assert.equal(view.tasks.length,2);assert.equal((await fs.stat(q.file)).mode&0o777,0o600);
 store.gate.resolve();await settled(q);assert.equal(store.calls,2);assert.equal((await store.read()).likes['post:post_1'].owner,undefined);assert.equal((await store.read()).likes['post:post_1'].other,true);
 assert.ok((await q.view(actor,'post_1')).tasks.every(task=>task.status==='done'));
});

test('out-of-order network arrivals cannot restore an older Like intent; retries are idempotent',async t=>{
 const store=memory(),q=await queue(t,store);await until(()=>!q.active);store.gate=deferred();
 const newer=operation('like','newer-off',{liked:false,clientId:'tab',sequence:2});await q.enqueue(newer);
 await q.enqueue(operation('like','older-on',{liked:true,clientId:'tab',sequence:1}));await q.enqueue(newer);
 assert.equal(q.record.jobs.length,1);assert.equal(q.record.receipts['older-on'].status,'superseded');
 await assert.rejects(q.enqueue({...newer,fingerprint:'different'}),e=>e.status===409);
 store.gate.resolve();await settled(q);assert.equal((await store.read()).likes['post:post_1'].owner,undefined);
});

test('create, reply, edit and delete preserve dependency order during an earlier Git write',async t=>{
 const store=memory(),q=await queue(t,store);await until(()=>!q.active);store.gate=deferred();
 await q.enqueue(create());await until(()=>store.calls===1);
 const original=(await q.read()).comments.c1;
 await q.enqueue(operation('edit','edit-123',{commentId:'c1',body:'Edited',expectedVersion:commentVersion(original),time:'2026-10-15T00:00:01.000Z'}));
 await q.enqueue(create('reply-123','c2',{parent:'c1',body:'Reply'}));
 await q.enqueue(operation('delete','delete-123',{commentId:'c1',expectedVersion:commentVersion((await q.read()).comments.c1),time:'2026-10-15T00:00:02.000Z'}));
 assert.equal((await q.read()).comments.c1.status,'deleted');assert.equal((await q.read()).comments.c2.parent_id,'c1');
 store.gate.resolve();await settled(q);
 const state=await store.read();assert.equal(state.comments.c1.status,'deleted');assert.equal(state.comments.c2.parent_id,'c1');assert.equal(Object.keys(state.comments).length,2);assert.ok((await q.view(actor,'post_1')).tasks.every(t=>t.status==='done'));
});

test('conflicting edits are rejected on acceptance; an external conflict fails only its task',async t=>{
 const store=memory(),q=await queue(t,store);await q.enqueue(create());await settled(q);
 const version=commentVersion((await q.read()).comments.c1);store.gate=deferred();
 await q.enqueue(operation('edit','edit-first',{commentId:'c1',body:'First',expectedVersion:version}));
 await assert.rejects(q.enqueue(operation('edit','edit-stale',{commentId:'c1',body:'Stale',expectedVersion:version})),e=>e.code==='version_conflict');
 store.gate.resolve();await settled(q);
 await assert.rejects(q.enqueue(operation('delete','intruder',{commentId:'c1',actor:{actorHash:'stranger',isAdmin:false}})),e=>e.status===403);
 const blocked=deferred(),transaction=store.transaction.bind(store);store.transaction=async fn=>{await blocked.promise;return transaction(state=>{state.comments.c1.body='External';return fn(state);});};
 await q.enqueue(operation('edit','edit-external',{commentId:'c1',body:'My draft'}));await q.enqueue(operation('like','independent-like',{liked:true}));blocked.resolve();await settled(q);
 assert.equal((await q.view(actor,'post_1')).tasks.find(t=>t.id==='edit-external').status,'failed');assert.equal((await store.read()).comments.c1.body,'External');assert.equal((await store.read()).likes['post:post_1'].owner,true);
});

test('Git outage preserves accepted tasks on disk and restart resumes them',async t=>{
 const root=await temporary(t),store=memory();store.offline=true;const first=await queue(t,store,root);
 await first.enqueue(create());await until(()=>first.record.receipts['create-123'].status==='retrying');await first.close();
 store.offline=false;const second=await queue(t,store,root);await settled(second);
 assert.equal((await store.read()).comments.c1.body,'Original');assert.equal(second.record.receipts['create-123'].status,'done');assert.equal(second.record.jobs.length,0);
});

test('crash between Git success and queue acknowledgement replays edits/deletes exactly once',async t=>{
 const root=await temporary(t),store=memory(),q=await queue(t,store,root);await until(()=>!q.active);q.closed=true;
 await q.enqueue(create());await q.enqueue(operation('edit','edit-once',{commentId:'c1',body:'Edited'}));await q.enqueue(operation('delete','delete-once',{commentId:'c1'}));
 const persist=q.persist.bind(q);let fail=true;q.persist=async record=>{if(fail&&!record.jobs.length){fail=false;throw new Error('crash after push');}return persist(record);};
 q.closed=false;await q.drain();await q.close();assert.equal((await store.read()).comments.c1.status,'deleted');
 const restarted=await queue(t,store,root);await settled(restarted);assert.equal((await store.read()).comments.c1.status,'deleted');assert.ok(Object.values(restarted.record.receipts).every(r=>r.status==='done'));
});

test('production review branches preserve original publication status and private projection',async t=>{
 const root=await temporary(t),remote=path.join(root,'remote.git');await fs.mkdir(remote);await git(remote,'init','--bare','--initial-branch=main');
 const store=new GitStore({directory:path.join(root,'git'),remote,recoverable:true}),q=await queue(t,store,root);await until(()=>!q.active);q.closed=true;
 await q.enqueue(create('first-request','c1',{title:'First post',url:'/one'}));await q.enqueue(create('second-request','c2',{title:'Second post',url:'/two'}));
 const projected=await q.read();assert.equal(publicPost(projected,'post_1').comments.length,0);assert.equal(publicPost(projected,'post_1','owner').comments.length,2);
 q.closed=false;await q.drain();await settled(q);
 const c=(await q.read()).comments.c1;await q.enqueue(operation('edit','pending-edit',{commentId:'c1',body:'Edited before merge',expectedVersion:commentVersion(c)}));await settled(q);
 const record=JSON.parse(await git(remote,'show','incoming/c1:comments/c1.json'));assert.equal(record.status,'published');assert.equal(record.body,'Edited before merge');assert.equal(JSON.parse(await git(remote,'show','incoming/c2:requests/c2.json')).title,'Second post');
 await assert.rejects(git(remote,'show','main:comments/c1.json'));assert.doesNotMatch(JSON.stringify(publicPost(await q.read(),'post_1','owner')),/owner_hash|applied_requests|_review_status|_unmerged/);
});

test('SIGKILL after durable acceptance resumes task and repairs interrupted dedicated Git checkout',async t=>{
 const root=await temporary(t),directory=path.join(root,'git'),queueDirectory=path.join(root,'queue');
 const store=new GitStore({directory,preview:true,recoverable:true});await store.read();
 const code=`const {GitStore}=require('./lib/comments/git-store'),{QueueStore}=require('./lib/comments/queue-store');(async()=>{const s=new GitStore({directory:${JSON.stringify(directory)},preview:true,recoverable:true});s.transaction=async()=>new Promise(()=>{});const q=await new QueueStore({store:s,directory:${JSON.stringify(queueDirectory)}}).open();await q.enqueue(${JSON.stringify(create())});console.log('ACCEPTED');setInterval(()=>{},1000);})();`;
 const child=spawn(process.execPath,['-e',code],{cwd:path.join(__dirname,'..'),stdio:['ignore','pipe','pipe']});
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});await new Promise((resolve,reject)=>{child.stdout.on('data',data=>{if(data.toString().includes('ACCEPTED'))resolve();});child.once('error',reject);child.once('exit',code=>reject(new Error('Child exited '+code)));});
 const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;
 await fs.writeFile(path.join(directory,'settings.json'),'interrupted write');await fs.mkdir(path.join(directory,'comments'),{recursive:true});await fs.writeFile(path.join(directory,'comments/uncommitted.json'),'interrupted new file');
 const restarted=await queue(t,new GitStore({directory,preview:true,recoverable:true}),root);await settled(restarted);
 assert.equal((await restarted.read()).comments.c1.body,'Original');assert.equal(restarted.record.receipts['create-123'].status,'done');assert.equal(await git(directory,'status','--porcelain'),'');
});


test('disk write failure never acknowledges or changes the accepted mirror',async t=>{
 const store=memory(),q=await queue(t,store);await until(()=>!q.active);q.closed=true;
 const before=await fs.readFile(q.file,'utf8'),persist=q.persist.bind(q);q.persist=async()=>{throw new Error('disk full');};
 await assert.rejects(q.enqueue(create()),/disk full/);assert.equal(q.record.jobs.length,0);assert.equal(Object.keys((await q.read()).comments).length,0);assert.equal(await fs.readFile(q.file,'utf8'),before);q.persist=persist;
});


test('a stale local mirror returns immediately and signals one background refresh to the client',async t=>{
 const store=memory(),q=await queue(t,store);await until(()=>!q.active);
 await store.transaction(state=>{state.likes['post:post_1']={external:true};});
 const read=store.read.bind(store),gate=deferred();store.read=async()=>{await gate.promise;return read();};q.lastRefresh=0;
 const view=await q.view(actor,'post_1');assert.equal(view.refreshing,true);assert.equal(view.state.likes['post:post_1'],undefined);await until(()=>q.active);
 gate.resolve();await until(()=>!q.active);const fresh=await q.view(actor,'post_1');assert.equal(fresh.refreshing,false);assert.equal(fresh.state.likes['post:post_1'].external,true);
});


test('full queue rejects new jobs before acceptance and still answers duplicate retries',async t=>{
 const q=await queue(t,memory());await until(()=>!q.active);q.closed=true;
 const ops=Array.from({length:100},(_,i)=>operation('like','cap-'+i,{liked:Boolean(i%2),clientId:'tab',sequence:i+1}));
 for(const op of ops)await q.enqueue(op);
 const before=await fs.readFile(q.file,'utf8');await assert.rejects(q.enqueue(operation('like','overflow',{liked:true,clientId:'tab',sequence:101})),e=>e.status===503&&e.code==='queue_full');
 assert.equal(q.record.jobs.length,100);assert.equal(q.record.receipts.overflow,undefined);assert.equal(await fs.readFile(q.file,'utf8'),before);
 assert.equal((await q.enqueue(ops[0])).task_id,'cap-0');assert.equal(await fs.readFile(q.file,'utf8'),before);
});

test('pending byte budget refuses oversized growth without dropping accepted work',async t=>{
 const q=await queue(t,memory());await until(()=>!q.active);q.closed=true;
 q.record.jobs=Array.from({length:35},(_,i)=>create('bytes-'+i,'bytes-c'+i,{body:'가'.repeat(10000)}));
 const before=structuredClone(q.record);await assert.rejects(q.enqueue(create('too-many-bytes','overflow',{body:'가'.repeat(10000)})),e=>e.code==='queue_full');
 assert.deepEqual(q.record,before);
});

test('restart bounds completed history and sequence keys while preserving pending tasks and failure drafts',async t=>{
 const root=await temporary(t),store=memory(),q=await queue(t,store,root);await until(()=>!q.active);q.closed=true;
 const now=Date.now(),old=now-8*24*60*60*1000,pending=operation('like','pending-job',{liked:false,clientId:'keep',sequence:9}),key='owner:post:post_1:keep';
 q.record.jobs=[pending];q.record.receipts={expired:{status:'done',completedAt:old,body:'expired'},recent:{status:'done',completedAt:now,body:'redundant'},failed:{status:'failed',completedAt:now,body:'restore me'},'pending-job':{status:'retrying',completedAt:old,body:'pending'}};
 q.record.sequences={[key]:9,expired:1,recent:2};q.record.sequenceTimes={[key]:old,expired:old,recent:now};
 for(let i=0;i<2005;i++){q.record.receipts['old-'+i]={status:'done',completedAt:now-100-i};q.record.sequences['stream-'+i]=i;q.record.sequenceTimes['stream-'+i]=now-100-i;}
 await q.persist(q.record);await q.close();store.offline=true;
 const restarted=await queue(t,store,root);assert.equal(restarted.record.jobs.length,1);assert.ok(restarted.record.receipts['pending-job']);assert.equal(restarted.record.receipts.expired,undefined);assert.equal(restarted.record.receipts.recent.body,undefined);assert.equal(restarted.record.receipts.failed.body,'restore me');assert.equal(Object.keys(restarted.record.receipts).length,2000);
 assert.equal(restarted.record.sequences[key],9);assert.equal(restarted.record.sequences.expired,undefined);assert.equal(Object.keys(restarted.record.sequences).length,2000);assert.equal(Object.keys(restarted.record.sequenceTimes).length,2000);
 await restarted.enqueue(operation('like','late-like',{liked:true,clientId:'keep',sequence:8}));assert.equal(restarted.record.receipts['late-like'].status,'superseded');assert.equal(restarted.record.jobs.length,1);assert.equal(restarted.record.sequences[key],9);
});
