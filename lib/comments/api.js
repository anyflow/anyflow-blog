'use strict';
const {randomBytes,createHmac,timingSafeEqual}=require('node:crypto');
const {CommentError,fail,id,text,authorLink,likeTarget,publicPost,fingerprint}=require('./model');
const YEAR=365*24*60*60,ADMIN_AGE=7*24*60*60,VISITOR_COOKIE='anyflow_visitor',ADMIN_COOKIE='anyflow_admin';
function equal(a,b){const left=Buffer.from(String(a)),right=Buffer.from(String(b));return left.length===right.length&&timingSafeEqual(left,right);}
function cookies(header=''){
  const result=Object.create(null);
  for(const part of header.split(';')){const i=part.indexOf('=');if(i>0){const key=part.slice(0,i).trim();if(result[key]!==undefined)result[key]='';else result[key]=part.slice(i+1).trim();}}
  return result;
}
function setCookie(req,res,name,value,maxAge){
  let local=false;try{local=['localhost','127.0.0.1','[::1]'].includes(new URL('http://'+req.headers.host).hostname);}catch{}
  const cookie=`${name}=${value}; Path=/api; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${local?'':'; Secure'}`;
  const previous=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),cookie]);
}
async function readJson(req){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))fail(415,'json_required','JSON 요청만 처리할 수 있습니다.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>65536)fail(413,'too_large','요청 크기가 너무 큽니다.');chunks.push(chunk);}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'invalid_json','JSON 요청을 확인해 주세요.');}
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'invalid_json','JSON 객체를 보내 주세요.');
  return value;
}
function fields(value,allowed){for(const key of Object.keys(value))if(!allowed.includes(key))fail(400,'invalid_input','지원하지 않는 입력 항목입니다.');}
function initialState(state){state.settings??={};state.comments??={};state.likes??={};state.settings.moderation??=false;state.settings.legacyLikes??={};}
function createCommentsHandler({store,catalog,secret,adminToken,adminName='관리자',origins}={}){
  if(!store?.read||!store?.transaction)throw new Error('Comment store is required');
  if(typeof secret!=='string'||secret.length<32||typeof adminToken!=='string'||adminToken.length<32)throw new Error('Comment secrets must contain at least 32 characters');
  if(!Array.isArray(origins)||!origins.length)throw new Error('Explicit comment origins are required');
  const allowedOrigins=new Set(origins.map(value=>new URL(value).origin));
  const posts=new Map();
  for(const [key,value] of catalog instanceof Map?catalog.entries():Array.isArray(catalog)?catalog.map(post=>[post.id||post.post_id,post]):Object.entries(catalog||{})){
    const post=typeof value==='string'?{id:key,url:value}:value;
    if(post)posts.set(String(post.id||post.post_id||key),post);
  }
  const hmac=value=>createHmac('sha256',secret).update(value).digest('hex');
  const adminSignature=(nonce,expires)=>hmac(`admin:${nonce}:${expires}:${adminToken}`);
  function identity(req,res){
    const values=cookies(req.headers.cookie),given=values[VISITOR_COOKIE];
    const visitor=/^[A-Za-z0-9_-]{43}$/.test(given||'')?given:randomBytes(32).toString('base64url');
    if(visitor!==given)setCookie(req,res,VISITOR_COOKIE,visitor,YEAR);
    const parts=(values[ADMIN_COOKIE]||'').split('.');
    const isAdmin=parts.length===3&&/^[A-Za-z0-9_-]{43}$/.test(parts[0])&&/^\d{10}$/.test(parts[1])&&/^[a-f0-9]{64}$/.test(parts[2])&&Number(parts[1])>Math.floor(Date.now()/1000)&&Number(parts[1])<=Math.floor(Date.now()/1000)+ADMIN_AGE+60&&equal(parts[2],adminSignature(parts[0],parts[1]));
    return {actorHash:hmac('visitor:'+visitor),isAdmin:Boolean(isAdmin)};
  }
  function postId(value){const key=id(value,'글 식별자');if(!posts.has(key))fail(404,'post_not_found','글을 찾을 수 없습니다.');return key;}
  function comment(state,key,post){const c=state.comments?.[id(key,'댓글 식별자')];if(!c||c.post_id!==post)fail(404,'comment_not_found','댓글을 찾을 수 없습니다.');return c;}
  function editable(c,actor){if(!actor.isAdmin&&(!c.owner_hash||c.owner_hash!==actor.actorHash))fail(403,'forbidden','작성한 브라우저에서만 수정·삭제할 수 있습니다.');}
  function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
  async function snapshot(post,actor){return {...publicPost(await store.read(),post,actor.actorHash,actor.isAdmin),preview:Boolean(store.preview)};}
  return async function commentsHandler(req,res){
    let url;try{url=new URL(req.url,'http://localhost');}catch{return false;}
    if(!url.pathname.startsWith('/api/'))return false;
    try{
      res.setHeader('Cache-Control','no-store');
      const origin=req.headers.origin;
      if(origin&&!allowedOrigins.has(origin))fail(403,'invalid_origin','허용되지 않은 요청 출처입니다.');
      if(req.method!=='GET'&&!allowedOrigins.has(origin))fail(403,'invalid_origin','동일한 블로그에서 요청해 주세요.');
      const actor=identity(req,res),route=url.pathname;
      if(route==='/api/comments'&&req.method==='GET'){
        const post=postId(url.searchParams.get('post'));json(res,200,await snapshot(post,actor));return true;
      }
      if(route==='/api/admin/login'&&req.method==='POST'){
        const data=await readJson(req);fields(data,['token']);
        if(typeof data.token!=='string'||!equal(data.token,adminToken))fail(401,'invalid_credentials','관리자 인증 정보를 확인해 주세요.');
        const nonce=randomBytes(32).toString('base64url'),expires=String(Math.floor(Date.now()/1000)+ADMIN_AGE);
        setCookie(req,res,ADMIN_COOKIE,`${nonce}.${expires}.${adminSignature(nonce,expires)}`,ADMIN_AGE);json(res,200,{is_admin:true});return true;
      }
      if(route==='/api/admin/session'&&req.method==='DELETE'){
        fields(await readJson(req),[]);setCookie(req,res,ADMIN_COOKIE,'',0);json(res,200,{is_admin:false});return true;
      }
      if(route.startsWith('/api/admin/')&&!actor.isAdmin)fail(401,'admin_required','관리자 인증이 필요합니다.');
      if(route==='/api/admin/settings'&&req.method==='PUT'){
        const data=await readJson(req);fields(data,['moderation']);if(typeof data.moderation!=='boolean')fail(400,'invalid_input','승인 설정은 true 또는 false여야 합니다.');
        await store.transaction(state=>{initialState(state);state.settings.moderation=data.moderation;},{message:'Update comment moderation setting'});
        json(res,200,{moderation:data.moderation});return true;
      }
      const approve=route.match(/^\/api\/admin\/comments\/([A-Za-z0-9_-]+)\/approve$/);
      if(approve&&req.method==='POST'){
        const data=await readJson(req);fields(data,['post_id']);const post=postId(data.post_id);
        await store.transaction(state=>{const c=comment(state,approve[1],post);if(c.status==='deleted')fail(409,'deleted_comment','삭제된 댓글은 승인할 수 없습니다.');c.status='published';},{commentId:approve[1],message:'Approve comment'});
        json(res,200,await snapshot(post,actor));return true;
      }
      if(route==='/api/comments'&&req.method==='POST'){
        const data=await readJson(req);fields(data,['post_id','request_id','parent_id','name','link','body']);
        const post=postId(data.post_id),requestId=id(data.request_id,'요청 식별자');
        if(requestId.length<8||requestId.length>128)fail(400,'invalid_request_id','요청 식별자를 확인해 주세요.');
        const parent=data.parent_id===undefined||data.parent_id===null?null:id(data.parent_id,'부모 댓글 식별자');
        const author={name:actor.isAdmin?adminName:text(data.name,'이름',80),link:authorLink(data.link),is_admin:actor.isAdmin};
        const body=text(data.body,'본문',10000),key=hmac(`request:${actor.actorHash}:${post}:${requestId}`).slice(0,32),hash=fingerprint({parent,author,body});
        await store.transaction(state=>{
          initialState(state);
          const existing=state.comments[key];
          if(existing){if(existing.owner_hash!==actor.actorHash||existing.request_fingerprint!==hash)fail(409,'request_conflict','이미 사용한 요청 식별자입니다.');return key;}
          if(parent){const p=comment(state,parent,post);if(p.status==='pending')fail(409,'pending_parent','승인 대기 댓글에는 아직 답글을 작성할 수 없습니다.');}
          const now=new Date().toISOString();
          state.comments[key]={id:key,post_id:post,parent_id:parent,author,body,created_at:now,updated_at:null,status:state.settings.moderation&&!actor.isAdmin?'pending':'published',owner_hash:actor.actorHash,request_fingerprint:hash,legacy:false,source:{provider:'native'}};
          return key;
        },{review:true,commentId:key,postTitle:posts.get(post).title||post,postUrl:posts.get(post).url||posts.get(post).permalink||'',message:'Add comment',notification:{title:posts.get(post).title||post,post_id:post,post_url:posts.get(post).url||posts.get(post).permalink||'',comment_id:key,author:author.name,body}});
        const result=await snapshot(post,actor);json(res,201,{...result,comment_id:key,pending:!result.comments.some(c=>c.id===key&&c.status==='published')});return true;
      }
      const item=route.match(/^\/api\/comments\/([A-Za-z0-9_-]+)$/);
      if(item&&['PATCH','DELETE'].includes(req.method)){
        const data=await readJson(req);fields(data,req.method==='PATCH'?['post_id','name','link','body']:['post_id']);const post=postId(data.post_id);
        await store.transaction(state=>{
          const c=comment(state,item[1],post);editable(c,actor);
          if(c.status==='deleted'){if(req.method==='DELETE')return;fail(409,'deleted_comment','삭제된 댓글은 수정할 수 없습니다.');}
          if(req.method==='DELETE'){c.status='deleted';c.body='';c.author={...c.author,link:''};}
          else{c.body=text(data.body,'본문',10000);if(data.name!==undefined)c.author.name=c.author.is_admin?c.author.name:text(data.name,'이름',80);if(data.link!==undefined)c.author.link=authorLink(data.link);}
          c.updated_at=new Date().toISOString();
        },{commentId:item[1],message:req.method==='DELETE'?'Delete comment':'Edit comment'});
        json(res,200,await snapshot(post,actor));return true;
      }
      if(route==='/api/likes'&&req.method==='PUT'){
        const data=await readJson(req);fields(data,['post_id','comment_id','liked']);const post=postId(data.post_id);
        const commentId=data.comment_id===undefined||data.comment_id===null?null:id(data.comment_id,'댓글 식별자');
        if(typeof data.liked!=='boolean')fail(400,'invalid_input','Like 상태는 true 또는 false여야 합니다.');
        await store.transaction(state=>{
          initialState(state);if(commentId&&comment(state,commentId,post).status!=='published')fail(409,'unavailable_comment','공개된 댓글에만 Like할 수 있습니다.');
          const target=likeTarget(post,commentId);state.likes[target]??={};if(data.liked)state.likes[target][actor.actorHash]=true;else delete state.likes[target][actor.actorHash];
        },{message:'Update like'});
        json(res,200,await snapshot(post,actor));return true;
      }
      fail(404,'not_found','API를 찾을 수 없습니다.');
    }catch(error){
      if(!res.headersSent)json(res,error instanceof CommentError?error.status:503,{error:error instanceof CommentError?error.code:'storage_unavailable',message:error instanceof CommentError?error.message:'댓글 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'});
      else res.end();
      return true;
    }
  };
}
module.exports={createCommentsHandler};
