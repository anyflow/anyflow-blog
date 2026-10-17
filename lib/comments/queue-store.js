'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {CommentError,fail,likeTarget,actorHashes}=require('./model');
const {applyOperation,commentVersion}=require('./operations');
const MAX_JOBS=100,MAX_PENDING_BYTES=1024*1024,HISTORY_LIMIT=2000,RETENTION_MS=7*24*60*60*1000;
const sequenceKey=op=>op.kind==='like'&&op.clientId?op.actor.actorHash+':'+likeTarget(op.post,op.commentId)+':'+op.clientId:null;
class QueueStore {
 constructor({store,directory,retryMs=5000,refreshMs=5000}={}){
  if(!store?.read||!store?.transaction||!path.isAbsolute(directory||''))throw new Error('A Git store and absolute queue directory are required');
  this.store=store;this.directory=directory;this.file=path.join(directory,'queue.json');this.preview=store.preview;
  this.retryMs=retryMs;this.refreshMs=refreshMs;this.serial=Promise.resolve();this.active=false;this.closed=false;this.lastRefresh=0;
 }
 exclusive(fn){const next=this.serial.then(fn);this.serial=next.catch(()=>{});return next;}
 async persist(record){
  const temporary=this.file+'.'+randomUUID()+'.tmp';
  const file=await fs.open(temporary,'wx',0o600);
  try{await file.writeFile(JSON.stringify(record)+'\n');await file.sync();}finally{await file.close();}
  await fs.rename(temporary,this.file);
  const directory=await fs.open(this.directory,'r');try{await directory.sync();}finally{await directory.close();}
 }
 async open(){
  await fs.mkdir(this.directory,{recursive:true,mode:0o700});
  try{this.record=JSON.parse(await fs.readFile(this.file,'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;this.record={version:1,revision:0,base:await this.store.read(),jobs:[],receipts:{},sequences:{},sequenceTimes:{}};await this.persist(this.record);this.lastRefresh=Date.now();}
  if(this.record.version!==1||!Array.isArray(this.record.jobs)||!this.record.base||!this.record.receipts||!this.record.sequences)throw new Error('Invalid durable comment queue');
  if(this.prune(this.record))await this.persist(this.record);
  this.wake();return this;
 }
 prune(record,now=Date.now()){
  let changed=false;const pending=new Set(record.jobs.map(op=>op.id)),terminal=[];
  for(const [id,receipt]of Object.entries(record.receipts)){
   if(pending.has(id)||!['done','failed','superseded'].includes(receipt.status))continue;
   if(!Number.isFinite(receipt.completedAt)){receipt.completedAt=now;changed=true;}
   if(receipt.status!=='failed'&&Object.hasOwn(receipt,'body')){delete receipt.body;changed=true;}
   if(receipt.completedAt<=now-RETENTION_MS){delete record.receipts[id];changed=true;}
   else terminal.push([id,receipt.completedAt]);
  }
  const excess=Object.keys(record.receipts).length-HISTORY_LIMIT;
  for(const [id]of terminal.sort((a,b)=>a[1]-b[1]).slice(0,Math.max(0,excess))){delete record.receipts[id];changed=true;}
  if(!record.sequenceTimes){record.sequenceTimes={};changed=true;}
  const active=new Set(record.jobs.map(sequenceKey).filter(Boolean)),inactive=[];
  for(const key of Object.keys(record.sequences)){
   if(!Number.isFinite(record.sequenceTimes[key])){record.sequenceTimes[key]=now;changed=true;}
   if(active.has(key))continue;
   if(record.sequenceTimes[key]<=now-RETENTION_MS){delete record.sequences[key];delete record.sequenceTimes[key];changed=true;}
   else inactive.push([key,record.sequenceTimes[key]]);
  }
  const extra=Object.keys(record.sequences).length-HISTORY_LIMIT;
  for(const [key]of inactive.sort((a,b)=>a[1]-b[1]).slice(0,Math.max(0,extra))){delete record.sequences[key];delete record.sequenceTimes[key];changed=true;}
  for(const key of Object.keys(record.sequenceTimes))if(!Object.hasOwn(record.sequences,key)){delete record.sequenceTimes[key];changed=true;}
  return changed;
 }
 project(record=this.record){
  const state=structuredClone(record.base);
  for(const op of record.jobs){
   const candidate=structuredClone(state);
   try{applyOperation(candidate,op);}catch(error){if(error instanceof CommentError)continue;throw error;}
   if(op.kind==='create'&&!this.preview&&!state.comments[op.commentId]&&candidate.comments[op.commentId]){
    const c=candidate.comments[op.commentId];c._unmerged=true;c._review_status=c.status;
   }
   Object.assign(state,candidate);
  }
  return state;
 }
 async view(actor,post){
  const result=await this.exclusive(()=>({state:this.project(),revision:this.record.revision,tasks:Object.values(this.record.receipts).filter(r=>actorHashes(actor).includes(r.actorHash)&&r.post===post&&(!r.isAdmin||actor.isAdmin)).map(r=>({id:r.id,request_id:r.requestId,kind:r.kind,status:r.status,comment_id:r.commentId||null,...(r.message?{message:r.message}:{}),...(r.status==='failed'&&r.body?{body:r.body}:{})}))}));
  if(!this.active&&!this.timer&&Date.now()-this.lastRefresh>=this.refreshMs)this.wake();
  result.refreshing=Boolean(this.active||this.scheduled);return result;
 }
 async read(){return (await this.exclusive(()=>this.project()));}
 async enqueue(op){
  const result=await this.exclusive(async()=>{
   const previous=this.record.receipts[op.id];
   if(previous){if(previous.fingerprint!==op.fingerprint)fail(409,'request_conflict','이미 사용한 요청 식별자입니다.');return {task_id:op.id,comment_id:previous.commentId||null};}
   const next=structuredClone(this.record),now=Date.now();this.prune(next,now);
   const key=sequenceKey(op),superseded=key&&op.sequence<=(next.sequences[key]||0);
   if(!superseded&&(next.jobs.length>=MAX_JOBS||Buffer.byteLength(JSON.stringify([...next.jobs,op]))>MAX_PENDING_BYTES))fail(503,'queue_full','처리 대기 중인 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
   const state=this.project(next);
   if(op.kind==='create')op.createdStatus=state.settings?.moderation&&!op.actor.isAdmin?'pending':'published';
   if(['edit','delete','approve'].includes(op.kind))op.expectedVersion??=state.comments[op.commentId]?commentVersion(state.comments[op.commentId]):undefined;
   if(!superseded)applyOperation(state,op);
   if(key){if(!superseded)next.sequences[key]=op.sequence;next.sequenceTimes[key]=now;}
   next.receipts[op.id]={id:op.id,requestId:op.requestId,actorHash:op.actor.actorHash,isAdmin:op.actor.isAdmin,post:op.post,kind:op.kind,commentId:op.commentId,fingerprint:op.fingerprint,status:superseded?'superseded':'queued',body:op.body};
   if(!superseded)next.jobs.push(op);else next.receipts[op.id].completedAt=now;
   this.prune(next,now);
   next.revision++;await this.persist(next);this.record=next;
   return {task_id:op.id,comment_id:op.commentId||null};
  });
  this.wake();return result;
 }
 wake(){if(this.closed||this.active||this.scheduled||this.timer)return;this.scheduled=true;setImmediate(()=>{this.scheduled=false;this.drain().catch(()=>this.retry());});}
 retry(){if(this.closed||this.timer)return;this.timer=setTimeout(()=>{this.timer=null;this.wake();},this.retryMs);this.timer.unref?.();}
 async drain(){
  if(this.closed||this.active)return;this.active=true;
  try{
   while(!this.closed){
    const batch=await this.exclusive(()=>structuredClone(this.record.jobs));
    let failures={};
    try{
     if(batch.length){
      failures=await this.store.transaction(state=>{
       const failed={};
       for(const op of batch){
        const candidate=structuredClone(state);
        try{applyOperation(candidate,op);Object.assign(state,candidate);}
        catch(error){if(!(error instanceof CommentError))throw error;failed[op.id]=error.message;}
       }
       return failed;
      },{reviewIds:batch.filter(op=>op.kind==='create').map(op=>op.commentId),notifications:Object.fromEntries(batch.filter(op=>op.kind==='create').map(op=>[op.commentId,{title:op.title||'',post_url:op.url||''}])),message:'Apply queued comment changes'});
     }
     const fresh=await this.store.read();this.lastRefresh=Date.now();
     await this.exclusive(async()=>{
      const next=structuredClone(this.record),ids=new Set(batch.map(op=>op.id));
      next.base=fresh;next.jobs=next.jobs.filter(op=>!ids.has(op.id));
      for(const op of batch){const receipt=next.receipts[op.id];receipt.status=failures[op.id]?'failed':'done';receipt.completedAt=Date.now();if(failures[op.id])receipt.message=failures[op.id];else delete receipt.message;}
      const pruned=this.prune(next);
      if(pruned||batch.length||JSON.stringify(next.base)!==JSON.stringify(this.record.base)){next.revision++;await this.persist(next);this.record=next;}
     });
    }catch(error){
     await this.exclusive(async()=>{
      const next=structuredClone(this.record);
      for(const op of batch){const receipt=next.receipts[op.id];receipt.status='retrying';receipt.message='Git 저장을 재시도하고 있습니다. 접수된 내용은 보관 중입니다.';}
      next.revision++;await this.persist(next);this.record=next;
     });
     this.retry();return;
    }
    const remaining=await this.exclusive(()=>this.record.jobs.length);
    if(!remaining)break;
   }
  }finally{this.active=false;if(!this.closed&&!this.timer&&this.record.jobs.length)this.wake();}
 }
 async close(){this.closed=true;clearTimeout(this.timer);this.timer=null;while(this.active)await new Promise(resolve=>setTimeout(resolve,10));await this.serial;}
}
module.exports={QueueStore};
