const {validPostId}=require('./post-key');
'use strict';
const {randomBytes,randomUUID,createHmac,timingSafeEqual}=require('node:crypto');
const {CommentError,fail,id,text,authorLink,publicPost,fingerprint}=require('./model');
const {applyOperation}=require('./operations');
const YEAR=365*24*60*60,ADMIN_AGE=7*24*60*60,VISITOR_COOKIE='anyflow_visitor',APEX_COOKIE='anyflow_apex_visitor',ADMIN_COOKIE='anyflow_admin';
function equal(a,b){const left=Buffer.from(String(a)),right=Buffer.from(String(b));return left.length===right.length&&timingSafeEqual(left,right);}
function cookies(header=''){
  const result=Object.create(null);
  for(const part of header.split(';')){const i=part.indexOf('=');if(i>0){const key=part.slice(0,i).trim();if(result[key]!==undefined)result[key]='';else result[key]=part.slice(i+1).trim();}}
  return result;
}
function setCookie(req,res,name,value,maxAge,domain=false){
  let local=false;try{local=['localhost','127.0.0.1','[::1]'].includes(new URL('http://'+req.headers.host).hostname);}catch{}
  const cookie=`${name}=${value}; Path=/api; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${local?'':'; Secure'}${domain?'; Domain=anyflow.net':''}`;
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
function createCommentsHandler({store,catalog,secret,adminToken,adminName='관리자',adminLink='https://www.anyflow.net',origins}={}){
  if(!store?.read||(!store?.enqueue&&!store?.transaction))throw new Error('Comment store is required');
  if(typeof secret!=='string'||secret.length<32||typeof adminToken!=='string'||adminToken.length<8)throw new Error('Comment secrets require a signing secret of at least 32 characters and an administrator key of at least 8 characters');
  if(!Array.isArray(origins)||!origins.length)throw new Error('Explicit comment origins are required');
  const allowedOrigins=new Set(origins.map(value=>new URL(value).origin));
  const posts=new Map(),aliases=new Map();
  for(const [key,value] of catalog instanceof Map?catalog.entries():Array.isArray(catalog)?catalog.map(post=>[post.id||post.post_id,post]):Object.entries(catalog||{})){
    const post=typeof value==='string'?{id:key,url:value}:value;
    if(post){const canonical=String(post.id||post.post_id||key);posts.set(canonical,post);for(const alias of post.aliases||[])if(validPostId(alias))aliases.set(alias,canonical);}
  }
  const hmac=value=>createHmac('sha256',secret).update(value).digest('hex');
  const adminSignature=(nonce,expires)=>hmac(`admin:${nonce}:${expires}:${adminToken}`);
  function identity(req,res){
    const values=cookies(req.headers.cookie),given=values[VISITOR_COOKIE];
    const legacy=/^[A-Za-z0-9_-]{43}$/.test(values[APEX_COOKIE]||'')?values[APEX_COOKIE]:null;
    const visitor=/^[A-Za-z0-9_-]{43}$/.test(given||'')?given:legacy||randomBytes(32).toString('base64url');
    if(visitor!==given)setCookie(req,res,VISITOR_COOKIE,visitor,YEAR);
    const parts=(values[ADMIN_COOKIE]||'').split('.');
    const isAdmin=parts.length===3&&/^[A-Za-z0-9_-]{43}$/.test(parts[0])&&/^\d{10}$/.test(parts[1])&&/^[a-f0-9]{64}$/.test(parts[2])&&Number(parts[1])>Math.floor(Date.now()/1000)&&Number(parts[1])<=Math.floor(Date.now()/1000)+ADMIN_AGE+60&&equal(parts[2],adminSignature(parts[0],parts[1]));
    return {actorHash:hmac('visitor:'+visitor),actorHashes:[...new Set([visitor,legacy].filter(Boolean).map(value=>hmac('visitor:'+value)))],isAdmin:Boolean(isAdmin)};
  }
  function postId(value){if(!validPostId(value))fail(400,'invalid_id','글 식별자 형식이 올바르지 않습니다.');const key=aliases.get(value)||value;if(!posts.has(key))fail(404,'post_not_found','글을 찾을 수 없습니다.');return key;}
  function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
  async function snapshot(post,actor){
    const view=store.view?await store.view(actor,post):{state:await store.read()};
    return {...publicPost(view.state,post,actor.actorHashes,actor.isAdmin),preview:Boolean(store.preview),...(store.view?{revision:view.revision,tasks:view.tasks,refreshing:view.refreshing}:{})};
  }
  async function submit(kind,data,actor,values){
    const requestId=data.request_id===undefined?randomUUID():id(data.request_id,'요청 식별자');
    if(requestId.length<8||requestId.length>128)fail(400,'invalid_request_id','요청 식별자를 확인해 주세요.');
    const op={...values,kind,actor,requestId,id:hmac(`task:${actor.actorHash}:${requestId}`).slice(0,32),fingerprint:fingerprint({kind,data}),time:new Date().toISOString()};
    if(store.enqueue)return store.enqueue(op);
    await store.transaction(state=>applyOperation(state,op),{review:kind==='create',commentId:op.commentId,message:kind+' comment',notification:{title:op.title||'',post_url:op.url||''}});
    return {};
  }
  const status=legacy=>store.enqueue?202:legacy;
  return async function commentsHandler(req,res){
    let url;try{url=new URL(req.url,'http://localhost');}catch{return false;}
    if(!url.pathname.startsWith('/api/'))return false;
    try{
      res.setHeader('Cache-Control','no-store');
      const origin=req.headers.origin;
      if(origin&&!allowedOrigins.has(origin))fail(403,'invalid_origin','허용되지 않은 요청 출처입니다.');
      if(req.method!=='GET'&&!allowedOrigins.has(origin))fail(403,'invalid_origin','동일한 블로그에서 요청해 주세요.');
      const route=url.pathname;
      if(route==='/api/identity-migration'&&req.method==='GET'){
        if((req.headers.host||'').split(':')[0]!=='anyflow.net'||origin!=='https://www.anyflow.net')fail(403,'invalid_origin','허용되지 않은 이전 요청입니다.');
        res.setHeader('Access-Control-Allow-Origin','https://www.anyflow.net');res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');
        const legacy=cookies(req.headers.cookie)[VISITOR_COOKIE];
        if(/^[A-Za-z0-9_-]{43}$/.test(legacy||''))setCookie(req,res,APEX_COOKIE,legacy,YEAR,true);
        res.writeHead(204);res.end();return true;
      }
      const actor=identity(req,res);
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
        const data=await readJson(req);fields(data,['moderation','request_id','post_id']);if(typeof data.moderation!=='boolean')fail(400,'invalid_input','승인 설정은 true 또는 false여야 합니다.');
        const post=data.post_id===undefined?null:postId(data.post_id);
        const accepted=await submit('settings',data,actor,{post,moderation:data.moderation});
        json(res,status(200),{...(post?await snapshot(post,actor):{moderation:data.moderation}),...accepted});return true;
      }
      const approve=route.match(/^\/api\/admin\/comments\/([A-Za-z0-9_-]+)\/approve$/);
      if(approve&&req.method==='POST'){
        const data=await readJson(req);fields(data,['post_id','request_id','expected_version']);const post=postId(data.post_id);
        const accepted=await submit('approve',data,actor,{post,commentId:approve[1],expectedVersion:version(data.expected_version)});
        json(res,status(200),{...await snapshot(post,actor),...accepted});return true;
      }
      if(route==='/api/comments'&&req.method==='POST'){
        const data=await readJson(req);fields(data,['post_id','request_id','parent_id','name','link','body']);
        const post=postId(data.post_id),requestId=id(data.request_id,'요청 식별자');
        const parent=data.parent_id===undefined||data.parent_id===null?null:id(data.parent_id,'부모 댓글 식별자');
        const author={name:actor.isAdmin?adminName:text(data.name,'이름',80),link:authorLink(actor.isAdmin?adminLink:data.link),is_admin:actor.isAdmin};
        const body=text(data.body,'본문',10000),key=hmac(`request:${actor.actorHash}:${post}:${requestId}`).slice(0,32);
        const accepted=await submit('create',data,actor,{post,commentId:key,parent,author,body,requestFingerprint:fingerprint({parent,author,body}),title:posts.get(post).title||post,url:posts.get(post).url||posts.get(post).permalink||''});
        const result=await snapshot(post,actor);json(res,status(201),{...result,...accepted,comment_id:key,pending:!result.comments.some(c=>c.id===key&&c.status==='published')});return true;
      }
      const item=route.match(/^\/api\/comments\/([A-Za-z0-9_-]+)$/);
      if(item&&['PATCH','DELETE'].includes(req.method)){
        const data=await readJson(req);fields(data,req.method==='PATCH'?['post_id','name','link','body','request_id','expected_version']:['post_id','request_id','expected_version']);const post=postId(data.post_id);
        const values={post,commentId:item[1],expectedVersion:version(data.expected_version)};
        if(req.method==='PATCH'){values.body=text(data.body,'본문',10000);if(data.name!==undefined)values.name=text(data.name,'이름',80);if(data.link!==undefined)values.link=authorLink(data.link);}
        const accepted=await submit(req.method==='DELETE'?'delete':'edit',data,actor,values);
        json(res,status(200),{...await snapshot(post,actor),...accepted});return true;
      }
      if(route==='/api/likes'&&req.method==='PUT'){
        const data=await readJson(req);fields(data,['post_id','comment_id','liked','request_id','client_id','sequence']);const post=postId(data.post_id);
        const commentId=data.comment_id===undefined||data.comment_id===null?null:id(data.comment_id,'댓글 식별자');
        if(typeof data.liked!=='boolean')fail(400,'invalid_input','Like 상태는 true 또는 false여야 합니다.');
        let clientId=null;
        if(data.client_id!==undefined||data.sequence!==undefined){clientId=id(data.client_id,'브라우저 요청 식별자');if(!Number.isSafeInteger(data.sequence)||data.sequence<1)fail(400,'invalid_sequence','Like 요청 순서를 확인해 주세요.');}
        const accepted=await submit('like',data,actor,{post,commentId,liked:data.liked,clientId,sequence:data.sequence});
        json(res,status(200),{...await snapshot(post,actor),...accepted});return true;
      }
      fail(404,'not_found','API를 찾을 수 없습니다.');
    }catch(error){
      if(!res.headersSent)json(res,error instanceof CommentError?error.status:503,{error:error instanceof CommentError?error.code:'storage_unavailable',message:error instanceof CommentError?error.message:'댓글 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'});
      else res.end();return true;
    }
  };
}
function version(value){if(value===undefined)return undefined;if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))fail(400,'invalid_version','댓글 버전을 확인해 주세요.');return value;}
module.exports={createCommentsHandler};
