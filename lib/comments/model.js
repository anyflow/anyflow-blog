'use strict';
const {createHash}=require('node:crypto');

class CommentError extends Error {
  constructor(status,code,message){super(message);this.status=status;this.code=code;}
}
function fail(status,code,message){throw new CommentError(status,code,message);}
function id(value,label='식별자'){
  if(typeof value!=='string'||! /^[A-Za-z0-9_-]{1,256}$/.test(value))fail(400,'invalid_id',`${label} 형식이 올바르지 않습니다.`);
  return value;
}
function text(value,label,max,{optional=false}={}){
  if(optional&&(value===undefined||value===null||value===''))return '';
  if(typeof value!=='string')fail(400,'invalid_input',`${label}을 확인해 주세요.`);
  const result=value.replace(/\r\n?/g,'\n').trim();
  if(!result||result.length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(result))fail(400,'invalid_input',`${label}은 1~${max}자로 입력해 주세요.`);
  return result;
}
function authorLink(value){
  if(value===undefined||value===null||value==='')return '';
  const input=text(value,'링크',2048);
  if(/[\s\u0000-\u001f\u007f]/.test(input))fail(400,'invalid_link','이메일 또는 홈페이지 주소를 확인해 주세요.');
  const mail=input.replace(/^mailto:/i,'');
  if(/^[^@?&#:<>]+@[^@?&#:<>]+\.[^@?&#:<>]+$/.test(mail))return 'mailto:'+mail;
  let url;
  try{url=new URL(input);}catch{fail(400,'invalid_link','홈페이지는 http:// 또는 https:// 주소로 입력해 주세요.');}
  if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)fail(400,'invalid_link','이메일 또는 http(s) 홈페이지 주소만 사용할 수 있습니다.');
  return url.href;
}
function likeTarget(postId,commentId=null){return commentId?`comment:${commentId}`:`post:${postId}`;}
function likeCount(state,target){
  const baseline=state.settings?.legacyLikes?.[target];
  return (Number.isSafeInteger(baseline)&&baseline>=0?baseline:0)+Object.values(state.likes?.[target]||{}).filter(value=>value===true).length;
}
function publicPost(state,postId,actorHash=null,isAdmin=false){
  const comments=Object.values(state.comments||{}).filter(c=>{
    const privileged=isAdmin||Boolean(actorHash&&c.owner_hash&&actorHash===c.owner_hash);
    return c.post_id===postId&&(!c._unmerged||privileged)&&(['published','deleted'].includes(c.status)||(privileged&&c.status==='pending'));
  }).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id))).map(c=>{
    const deleted=c.status==='deleted',target=likeTarget(postId,c.id),owned=Boolean(actorHash&&c.owner_hash&&actorHash===c.owner_hash);
    let link='';try{link=authorLink(c.author?.link);}catch{}
    return {
      id:c.id,post_id:c.post_id,parent_id:c.parent_id||null,
      author:{name:String(c.author?.name||'이름 없음'),link,is_admin:c.author?.is_admin===true},
      body:deleted?'삭제된 댓글입니다':String(c.body||''),created_at:c.created_at,updated_at:c.updated_at||null,status:c.status,
      legacy:c.legacy===true,source:typeof c.source==='string'?c.source:String(c.source?.provider||c.source?.type||c.source?.kind||''),
      likes:deleted?0:likeCount(state,target),liked:!deleted&&Boolean(actorHash&&state.likes?.[target]?.[actorHash]),
      can_edit:!deleted&&(isAdmin||owned),can_delete:!deleted&&(isAdmin||owned)
    };
  });
  const target=likeTarget(postId);
  return {comments,post_likes:likeCount(state,target),post_liked:Boolean(actorHash&&state.likes?.[target]?.[actorHash]),is_admin:Boolean(isAdmin),moderation:state.settings?.moderation===true};
}
function fingerprint(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
module.exports={CommentError,fail,id,text,authorLink,likeTarget,likeCount,publicPost,fingerprint};
