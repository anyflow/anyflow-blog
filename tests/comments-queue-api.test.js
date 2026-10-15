'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createCommentsHandler}=require('../lib/comments/api'),{QueueStore}=require('../lib/comments/queue-store');
const origin='http://127.0.0.1:8765';
async function fixture(t,{preview=true,moderation=false}={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'comments-queue-http-'));let state={settings:{moderation,legacyLikes:{}},comments:{},likes:{}};
 let release;const gate=new Promise(resolve=>release=resolve);
 const git={preview,async read(){return structuredClone(state);},async transaction(fn){await gate;const next=structuredClone(state),result=fn(next);state=next;return result;}};
 const queue=await new QueueStore({store:git,directory,refreshMs:60000}).open();
 const handler=createCommentsHandler({store:queue,catalog:[{id:'post_1'}],secret:'s'.repeat(64),adminToken:'a'.repeat(64),origins:[origin]});
 const server=http.createServer(async(req,res)=>{if(!await handler(req,res))res.writeHead(404).end();});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{release();await new Promise(r=>server.close(r));await queue.close();await fs.rm(directory,{recursive:true,force:true});});
 function browser(){let cookie='';return {async request(method,url,data){const start=performance.now();const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},...(data?{body:JSON.stringify(data)}:{})});const values=new Map(cookie.split('; ').filter(Boolean).map(p=>p.split('=')));for(const value of response.headers.getSetCookie()){const [k,v]=value.split(';')[0].split('=');values.set(k,v);}cookie=[...values].map(([k,v])=>k+'='+v).join('; ');return {status:response.status,data:await response.json(),ms:performance.now()-start};}};}
 return {browser,queue,release};
}
const create=(request_id='create-http-123')=>({post_id:'post_1',request_id,name:'Owner',body:'Original'});

test('HTTP mutations return durable 202 while Git is blocked; same-comment dependencies and stale edits are handled',async t=>{
 const f=await fixture(t),one=f.browser(),two=f.browser();await one.request('GET','/api/comments?post=post_1');
 const created=await one.request('POST','/api/comments',create());assert.equal(created.status,202);assert.ok(created.ms<500);assert.equal(created.data.tasks[0].status,'queued');const id=created.data.comment_id,version=created.data.comments[0].version;
 const edited=await one.request('PATCH','/api/comments/'+id,{post_id:'post_1',request_id:'edit-http-123',expected_version:version,body:'Edited'});assert.equal(edited.status,202);assert.equal(edited.data.comments[0].body,'Edited');assert.ok(edited.ms<500);
 assert.equal((await one.request('PATCH','/api/comments/'+id,{post_id:'post_1',request_id:'stale-http-123',expected_version:version,body:'Stale'})).status,409);
 assert.equal((await two.request('DELETE','/api/comments/'+id,{post_id:'post_1',request_id:'intruder-http-123'})).status,403);
 const reply=await one.request('POST','/api/comments',{...create('reply-http-123'),parent_id:id,body:'Reply'});assert.equal(reply.status,202);
 const deleted=await one.request('DELETE','/api/comments/'+id,{post_id:'post_1',request_id:'delete-http-123',expected_version:edited.data.comments[0].version});assert.equal(deleted.status,202);assert.equal(deleted.data.comments.find(c=>c.id===id).status,'deleted');assert.equal(deleted.data.comments.find(c=>c.id===reply.data.comment_id).parent_id,id);
 t.diagnostic('Blocked-Git acceptance: create '+created.ms.toFixed(1)+'ms, edit '+edited.ms.toFixed(1)+'ms, delete '+deleted.ms.toFixed(1)+'ms');
 const retried=await one.request('POST','/api/comments',create());assert.equal(retried.status,202);assert.equal(retried.data.comment_id,id);assert.equal(f.queue.record.jobs.length,4);
 assert.doesNotMatch(JSON.stringify(retried.data),/owner_hash|actorHash|request_fingerprint|applied_requests|secret/);
 f.release();
});

test('production pending tasks and drafts remain actor-private; moderation cannot be bypassed through queued replies',async t=>{
 const f=await fixture(t,{preview:false,moderation:true}),owner=f.browser(),stranger=f.browser(),admin=f.browser();
 const created=await owner.request('POST','/api/comments',create());assert.equal(created.data.pending,true);assert.equal(created.data.comments[0].status,'pending');
 const anonymous=await stranger.request('GET','/api/comments?post=post_1');assert.equal(anonymous.data.comments.length,0);assert.equal(anonymous.data.tasks.length,0);
 assert.equal((await owner.request('POST','/api/comments',{...create('pending-reply'),parent_id:created.data.comment_id})).status,409);
 assert.equal((await owner.request('PUT','/api/likes',{post_id:'post_1',comment_id:created.data.comment_id,liked:true})).status,409);
 await admin.request('POST','/api/admin/login',{token:'a'.repeat(64)});
 assert.equal((await admin.request('GET','/api/comments?post=post_1')).data.comments.length,1);
 const approved=await admin.request('POST','/api/admin/comments/'+created.data.comment_id+'/approve',{post_id:'post_1',request_id:'approve-http-123'});assert.equal(approved.status,202);assert.equal(approved.data.comments[0].status,'published');
 const settings=await admin.request('PUT','/api/admin/settings',{post_id:'post_1',moderation:false,request_id:'settings-http-123'});assert.equal(settings.status,202);assert.equal(settings.data.moderation,false);assert.equal(settings.data.tasks.length,2);
 await admin.request('DELETE','/api/admin/session',{});assert.equal((await admin.request('GET','/api/comments?post=post_1')).data.tasks.length,0);
 f.release();
});

test('out-of-order Like HTTP arrival retains last browser intent, with per-browser ownership and strict inputs',async t=>{
 const f=await fixture(t),one=f.browser();await one.request('GET','/api/comments?post=post_1');
 const off={post_id:'post_1',request_id:'like-newer-123',liked:false,client_id:'tab-123',sequence:2};
 const newer=await one.request('PUT','/api/likes',off);assert.equal(newer.status,202);
 const older=await one.request('PUT','/api/likes',{...off,request_id:'like-older-123',liked:true,sequence:1});assert.equal(older.status,202);assert.equal(older.data.post_liked,false);assert.equal(older.data.tasks.find(t=>t.request_id==='like-older-123').status,'superseded');
 assert.equal((await one.request('PUT','/api/likes',{...off,liked:true})).status,409);
 for(const data of [{...off,request_id:'invalid-1',sequence:0},{...off,request_id:'invalid-2',sequence:1.1},{...off,request_id:'invalid-3',client_id:'../bad'}])assert.equal((await one.request('PUT','/api/likes',data)).status,400);
 assert.equal(f.queue.record.jobs.length,1);f.release();
});
