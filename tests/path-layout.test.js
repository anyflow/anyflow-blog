const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),http=require('node:http'),{randomUUID}=require('node:crypto');
const {makePlan,applyContent}=require('../lib/path-migration'),{transformState,transformQueue}=require('../lib/comments/path-migration'),{publicFile,validPostId}=require('../lib/comments/post-key');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'path-layout-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('flat notes and per-post media migrate both ways, including later posts and media',t=>{
 const root=fixture(t);fs.mkdirSync(path.join(root,'cat/slug'),{recursive:true});fs.mkdirSync(path.join(root,'_assets/visuals'),{recursive:true});
 fs.writeFileSync(path.join(root,'_assets/visuals/manifest.json'),JSON.stringify({pages:{'/cat/slug':{pageId:'abcdef0123456789'}}}));
 fs.writeFileSync(path.join(root,'cat/slug/slug.md'),'---\ntitle: Test\npermalink: /cat/slug\nkind: post\ndraft: false\n---\n\n![Photo](a.png)\n\n```md\n![Example](a.png)\n```');fs.writeFileSync(path.join(root,'cat/slug/a.png'),'bytes');
 cp.execFileSync('git',['init','-q',root]);cp.execFileSync('git',['-C',root,'add','.']);
 const plan=makePlan(root);applyContent(root,plan);
 let content=fs.readFileSync(path.join(root,'cat/slug.md'),'utf8');assert.doesNotMatch(content,/^permalink:/m);assert.match(content,/\.\.\/_assets\/cat\/slug\/a.png/);assert.match(content,/```md\n!\[Example\]\(a.png\)/);assert.equal(fs.readFileSync(path.join(root,'_assets/cat/slug/a.png'),'utf8'),'bytes');
 fs.writeFileSync(path.join(root,'cat/new.md'),'---\ntitle: New\nkind: post\ndraft: false\n---\n\n![Later](../_assets/cat/new/later.png)');fs.mkdirSync(path.join(root,'_assets/cat/new'),{recursive:true});fs.writeFileSync(path.join(root,'_assets/cat/new/later.png'),'later');
 applyContent(root,plan,true);content=fs.readFileSync(path.join(root,'cat/slug/slug.md'),'utf8');assert.match(content,/permalink: \/cat\/slug/);assert.equal(fs.readFileSync(path.join(root,'cat/slug/a.png'),'utf8'),'bytes');
 assert.match(fs.readFileSync(path.join(root,'cat/new/new.md'),'utf8'),/^post_id: [a-f0-9]{32}$/m);assert.equal(fs.readFileSync(path.join(root,'cat/new/later.png'),'utf8'),'later');
});
test('comment identity conversion preserves ownership, relationships, likes and queue replay state',()=>{
 const plan={ids:{old:'/cat/slug'}},state={comments:{c:{id:'c',post_id:'old',parent_id:null,owner_hash:'owner',body:'Body'}},likes:{'post:old':{actor:true},'comment:c':{actor:true}},settings:{legacyLikes:{'post:old':7,'comment:c':3},moderation:true}};
 const next=transformState(state,plan);assert.equal(next.comments.c.post_id,'/cat/slug');assert.deepEqual(transformState(next,plan,true),state);
 const q={version:1,revision:0,base:state,jobs:[],receipts:{r:{post:'old',fingerprint:'unchanged',status:'done'}},sequences:{'actor:post:old:client':8}};
 const back=transformQueue(transformQueue(q,plan),plan,true);back.revision=q.revision;assert.deepEqual(back,q);
 assert.throws(()=>transformQueue({...q,jobs:[{}]},plan),/Drain/);assert.throws(()=>transformState({...state,comments:{c:{post_id:'missing'}}},plan),/Unmapped/);
 assert.match(transformState({...next,comments:{c:{post_id:'/new'}}},plan,true).comments.c.post_id,/^[a-f0-9]{32}$/);
 assert.ok(validPostId('/cat/slug'));for(const bad of ['/../escape','//escape','/a/','/a%2fb'])assert.equal(validPostId(bad),false);
 assert.match(publicFile('/cat/slug'),/^[a-f0-9]{64}\.json$/);assert.equal(publicFile('old'),'old.json');
});
test('path IDs support actual API create, reply, Like, edit and delete with legacy-tab aliases',async t=>{
 const state={comments:{},likes:{},settings:{legacyLikes:{},moderation:false}},store={preview:true,read:async()=>structuredClone(state),transaction:async fn=>fn(state)};
 const handler=require('../lib/comments/api').createCommentsHandler({store,catalog:[{id:'/cat/slug',aliases:['old'],url:'/cat/slug'}],secret:'s'.repeat(32),adminToken:'test-admin-key',origins:['http://localhost']});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 async function request(route,method='GET',data){const response=await fetch(base+route,{method,headers:{Origin:'http://localhost','Content-Type':'application/json',Cookie:cookie},body:data?JSON.stringify(data):undefined});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];assert.ok(response.status<300,response.status+' '+await response.clone().text());return response.json();}
 const post_id='/cat/slug',created=await request('/api/comments','POST',{post_id,request_id:randomUUID(),name:'Writer',body:'Parent'}),id=created.comment_id;
 const reply=await request('/api/comments','POST',{post_id,request_id:randomUUID(),name:'Writer',body:'Reply',parent_id:id});assert.equal(reply.comments.find(c=>c.id===reply.comment_id).parent_id,id);
 const liked=await request('/api/likes','PUT',{post_id,request_id:randomUUID(),liked:true});assert.equal(liked.post_likes,1);
 const edited=await request('/api/comments/'+id,'PATCH',{post_id,request_id:randomUUID(),body:'Edited'});assert.equal(edited.comments.find(c=>c.id===id).body,'Edited');
 const legacy=await request('/api/comments?post=old');assert.equal(legacy.comments[0].post_id,post_id);
 const deleted=await request('/api/comments/'+id,'DELETE',{post_id,request_id:randomUUID()});assert.equal(deleted.comments.find(c=>c.id===id).status,'deleted');
});

test('a queued creation replay returns its original comment ID across post ID migration',async t=>{
 const existing={id:'original-comment',post_id:'/cat/slug',parent_id:null,author:{name:'Writer',link:'',is_admin:false},body:'Saved',status:'published',created_at:'2026-01-01T00:00:00Z'};
 const store={preview:true,read:async()=>({comments:{[existing.id]:existing},likes:{},settings:{legacyLikes:{}}}),enqueue:async()=>({task_id:'old-task',comment_id:existing.id})};
 const handler=require('../lib/comments/api').createCommentsHandler({store,catalog:[{id:'/cat/slug',aliases:['old']}],secret:'s'.repeat(32),adminToken:'test-admin-key',origins:['http://localhost']});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/comments',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({post_id:'old',request_id:randomUUID(),name:'Writer',body:'Saved'})});
 const data=await response.json();assert.equal(data.comment_id,existing.id);assert.equal(data.pending,false);assert.equal(data.comments.length,1);
});
