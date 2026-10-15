'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {createHash,randomUUID}=require('node:crypto');
const identityKey=Symbol.for('anyflow.comments.gitStoreProcessId');
const processId=globalThis[identityKey]??=randomUUID();
const run=promisify(execFile);
// Node PID 1 cannot reap detached Git maintenance workers.
const foreground=['-c','maintenance.autoDetach=false','-c','gc.autoDetach=false'];
const {readState,exportPublic}=require('./export');
const safe=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(value);
const json=value=>JSON.stringify(value,null,2)+'\n';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const exists=file=>fs.access(file).then(()=>true,()=>false);

class GitStore {
  constructor({directory,remote=null,branch='main',preview=false,retries=3,recoverable=false}={}){
    if(!path.isAbsolute(directory||''))throw new Error('댓글 저장소에는 절대 경로가 필요합니다.');
    if(!safe(branch))throw new Error('댓글 저장소 branch를 확인해 주세요.');
    this.directory=directory;this.remote=remote;this.branch=branch;this.preview=preview;this.retries=retries;
    this.readCache=null;this.pendingRead=null;this.writes=0;this.recoverable=recoverable;
  }
  async git(...args){
    try{return (await run('git',[...foreground,...args],{cwd:this.directory,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},maxBuffer:16*1024*1024,timeout:30000})).stdout.trim();}
    catch(error){const failure=new Error('댓글 Git 작업에 실패했습니다: '+String(error.stderr||error.message).slice(0,1500));failure.code='git_failure';throw failure;}
  }
  async locked(fn){
    const lock=this.directory+'.lock';
    await fs.mkdir(path.dirname(lock),{recursive:true});
    const until=Date.now()+30000;
    while(true){
      try{await fs.mkdir(lock);await fs.writeFile(path.join(lock,'owner.json'),json({pid:process.pid,processId}));break;}
      catch(error){
        if(error.code!=='EEXIST')throw error;
        let owner;try{owner=JSON.parse(await fs.readFile(path.join(lock,'owner.json'),'utf8'));}catch{}
        if(owner?.pid===process.pid&&owner.processId!==processId){await fs.rm(lock,{recursive:true,force:true});continue;}
        if(owner?.pid){try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH'){await fs.rm(lock,{recursive:true,force:true});continue;}}}
        if(Date.now()>until)throw new Error('댓글 저장 작업이 사용 중입니다. 잠시 후 다시 시도해 주세요.');
        await pause(50);
      }
    }
    try{await this.ensure();return await fn();}
    finally{await fs.rm(lock,{recursive:true,force:true});}
  }
  async ensure(){
    if(this.ready)return;
    if(!await exists(path.join(this.directory,'.git'))){
      if(await exists(this.directory)&&(await fs.readdir(this.directory)).length)throw new Error('댓글 전용의 빈 디렉터리만 초기화할 수 있습니다.');
      if(this.remote){await fs.mkdir(path.dirname(this.directory),{recursive:true});await run('git',[...foreground,'clone',this.remote,this.directory],{env:{...process.env,GIT_TERMINAL_PROMPT:'0'},timeout:30000});}
      else{await fs.mkdir(this.directory,{recursive:true});await this.git('init','-b',this.branch);}
    }
    this.hasOrigin=Boolean(await this.git('remote','get-url','origin').catch(()=>''));
    if(!this.hasOrigin&&!this.preview)throw new Error('운영 댓글 저장소에는 Git origin이 필요합니다. 로컬 검수는 preview:true를 사용하세요.');
    if(!await exists(path.join(this.directory,'.comments-store'))){
      const files=await this.git('ls-files');
      if(files)throw new Error('이 디렉터리는 댓글 전용 저장소가 아닙니다.');
      await this.git('checkout','-B',this.branch);
      await fs.writeFile(path.join(this.directory,'.comments-store'),'anyflow-comments-v1\n');
      await fs.writeFile(path.join(this.directory,'settings.json'),json({moderation:false,legacyLikes:{}}));
      await this.commit('Initialize private comment store');
      if(this.hasOrigin)await this.git('push','-u','origin',this.branch);
    }
    this.ready=true;
  }
  async commit(message){
    await this.git('add','--all');
    if(!await this.git('diff','--cached','--name-only'))return false;
    await this.git('-c','user.name=Anyflow Comments','-c','user.email=comments@anyflow.net','commit','-m',String(message||'Update comments').slice(0,500));
    return true;
  }
  async refresh(){
    if(await this.git('status','--porcelain')){
      if(!this.recoverable)throw new Error('댓글 작업 사본에 미저장 변경이 있습니다. 자동으로 덮어쓰지 않습니다.');
      // This dedicated checkout is disposable; accepted work is durable in the sibling queue.
      await this.git('reset','--hard','HEAD');await this.git('clean','-fd','--','comments','likes','public','requests','settings.json');
    }
    if(this.hasOrigin){
      await this.git('fetch','--prune','origin','+refs/heads/*:refs/remotes/origin/*');
      await this.git('checkout','-B',this.branch,'origin/'+this.branch);
    }else await this.git('checkout',this.branch);
  }
  async snapshot(){
    const state=await readState(this.directory),incoming=new Map();
    if(this.hasOrigin&&!this.preview){
      const refs=(await this.git('for-each-ref','--format=%(refname:short)','refs/remotes/origin/incoming/')).split('\n').filter(Boolean);
      for(const ref of refs){
        const commentId=ref.slice('origin/incoming/'.length);
        if(!safe(commentId)||state.comments[commentId])continue;
        const raw=await this.git('show',ref+':comments/'+commentId+'.json').catch(()=>'');
        if(!raw)continue;
        const comment=JSON.parse(raw);
        if(comment.id!==commentId)throw new Error('대기 댓글 파일과 식별자가 일치하지 않습니다.');
        incoming.set(commentId,{ref,comment});
        // A branch is never public before its pull request is merged.
        state.comments[commentId]={...comment,status:comment.status==='deleted'?'deleted':'pending',_unmerged:true,_review_status:comment.status};
      }
    }
    return {state,incoming};
  }
  async read(){
    if(!this.writes&&this.readCache?.expires>Date.now())return structuredClone(this.readCache.state);
    if(!this.pendingRead){
      this.readCache=null;
      this.pendingRead=this.locked(async()=>{
        await this.refresh();
        const state=(await this.snapshot()).state;
        if(!this.writes)this.readCache={state,expires:Date.now()+5000};
        return state;
      }).finally(()=>{this.pendingRead=null;});
    }
    return structuredClone(await this.pendingRead);
  }
  async writeFile(file,value){
    const target=path.join(this.directory,file);
    await fs.mkdir(path.dirname(target),{recursive:true});
    if(value===undefined)await fs.rm(target,{force:true});
    else await fs.writeFile(target,json(value));
  }
  storedComment(comment){if(comment===undefined)return undefined;const {_unmerged,_review_status,...stored}=comment;if(_unmerged&&stored.status==='pending'&&_review_status)stored.status=_review_status;return stored;}
  async writeChanges(before,after,{skip=new Set()}={}){
    if(!equal(before.settings,after.settings))await this.writeFile('settings.json',after.settings);
    for(const id of new Set([...Object.keys(before.comments),...Object.keys(after.comments)])){
      if(!safe(id))throw new Error('댓글 파일 식별자가 올바르지 않습니다.');
      if(!skip.has(id)&&!equal(before.comments[id],after.comments[id]))await this.writeFile('comments/'+id+'.json',this.storedComment(after.comments[id]));
    }
    for(const target of new Set([...Object.keys(before.likes),...Object.keys(after.likes)])){
      if(!/^(post|comment):[A-Za-z0-9_-]{1,256}$/.test(target))throw new Error('Like 대상이 올바르지 않습니다.');
      if(!equal(before.likes[target],after.likes[target]))await this.writeFile('likes/'+createHash('sha256').update(target).digest('hex')+'.json',after.likes[target]===undefined?undefined:{target,actors:after.likes[target]});
    }
  }
  async transaction(fn,options={}){
    this.writes++;this.readCache=null;
    try{return await this.locked(async()=>{
      for(let attempt=0;attempt<this.retries;attempt++){
        await this.refresh();
        const {state:before,incoming}=await this.snapshot(),after=structuredClone(before);
        const result=await fn(after);
        const changed=Object.keys(after.comments).filter(id=>!equal(before.comments[id],after.comments[id]));
        const requests=changed.filter(id=>incoming.has(id)||((options.review||options.reviewIds?.includes(id))&&!before.comments[id]));
        for(const id of Object.keys(after.comments))if(!safe(id))throw new Error('댓글 식별자가 올바르지 않습니다.');
        for(const target of Object.keys(after.likes))if(!/^(post|comment):[A-Za-z0-9_-]{1,256}$/.test(target))throw new Error('Like 대상이 올바르지 않습니다.');
        if(this.preview){
          await this.writeChanges(before,after);
          await exportPublic(this.directory);
          if(await this.commit(options.message))await this.pushMain();
          return result;
        }
        // Review requests only change their own comment; unrelated Likes stay on main.
        await this.writeChanges(before,after,{skip:new Set(requests)});
        const committed=await this.commit(options.message);
        if(committed){
          try{await this.pushMain();}catch(error){if(attempt+1<this.retries){await this.git('reset','--hard','HEAD');continue;}throw error;}
        }
        let conflict=false;
        for(const id of requests){
          if(!safe(id)||!after.comments[id])throw new Error('댓글 요청 식별자가 올바르지 않습니다.');
          const previous=incoming.get(id),branch='incoming/'+id;
          await this.git('checkout','-B',branch,previous?.ref||this.branch);
          await this.writeFile('comments/'+id+'.json',this.storedComment(after.comments[id]));
          if(!previous){
            const n=options.notifications?.[id]||options.notification||{};
            await this.writeFile('requests/'+id+'.json',{comment_id:id,post_id:after.comments[id].post_id,title:n.title||options.postTitle||'',post_url:n.post_url||options.postUrl||''});
          }
          await this.commit(options.message||'New comment '+id);
          if(this.hasOrigin){
            try{await this.git('push','origin','HEAD:refs/heads/'+branch);}
            catch(error){
              await this.git('checkout',this.branch);
              if(attempt+1<this.retries){conflict=true;break;}
              throw error;
            }
          }
          await this.git('checkout',this.branch);
        }
        if(conflict)continue;
        await this.refresh();
        // Retry only if the intended request did not reach its remote branch.
        const latest=(await this.snapshot()).state;
        if(requests.some(id=>!latest.comments[id])&&attempt+1<this.retries)continue;
        return result;
      }
      throw new Error('댓글 저장 충돌을 해결하지 못했습니다. 다시 시도해 주세요.');
    });}finally{this.writes--;this.readCache=null;}
  }
  async pushMain(){if(this.hasOrigin)await this.git('push','origin',this.branch);}
}
module.exports={GitStore,GitCommentStore:GitStore};
