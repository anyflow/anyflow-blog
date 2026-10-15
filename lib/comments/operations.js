'use strict';
const {fail,likeTarget,commentVersion,actorHashes}=require('./model');
function initialState(state){state.settings??={};state.comments??={};state.likes??={};state.settings.moderation??=false;state.settings.legacyLikes??={};}
function findComment(state,key,post){const c=state.comments[key];if(!c||c.post_id!==post)fail(404,'comment_not_found','댓글을 찾을 수 없습니다.');return c;}
function editable(c,actor){if(!actor.isAdmin&&(!c.owner_hash||!actorHashes(actor).includes(c.owner_hash)))fail(403,'forbidden','작성한 브라우저에서만 수정·삭제할 수 있습니다.');}
function published(c){return c.status==='published'||(c.status==='pending'&&c._unmerged&&c._review_status==='published');}
function applyOperation(state,op){
 initialState(state);
 if(op.kind==='settings'){state.settings.moderation=op.moderation;return;}
 if(op.kind==='like'){
  if(op.commentId){const c=findComment(state,op.commentId,op.post);if(!published(c)||(c._unmerged&&!op.actor.isAdmin&&!actorHashes(op.actor).includes(c.owner_hash)))fail(409,'unavailable_comment','공개된 댓글에만 Like할 수 있습니다.');}
  const target=likeTarget(op.post,op.commentId);state.likes[target]??={};
  if(op.liked){if(!actorHashes(op.actor).some(hash=>state.likes[target][hash]))state.likes[target][op.actor.actorHash]=true;}else for(const hash of actorHashes(op.actor))delete state.likes[target][hash];return;
 }
 let c=state.comments[op.commentId];
 if(op.kind==='create'){
  if(c){if(c.post_id!==op.post||!actorHashes(op.actor).includes(c.owner_hash)||c.request_fingerprint!==op.requestFingerprint)fail(409,'request_conflict','이미 사용한 요청 식별자입니다.');return;}
  if(op.parent){const parent=findComment(state,op.parent,op.post);if(!published(parent)||(parent._unmerged&&!op.actor.isAdmin&&!actorHashes(op.actor).includes(parent.owner_hash)))fail(409,'pending_parent','승인 대기 댓글에는 아직 답글을 작성할 수 없습니다.');}
  c=state.comments[op.commentId]={id:op.commentId,post_id:op.post,parent_id:op.parent,author:op.author,body:op.body,created_at:op.time,updated_at:null,status:op.createdStatus||((state.settings.moderation&&!op.actor.isAdmin)?'pending':'published'),owner_hash:op.actor.actorHash,request_fingerprint:op.requestFingerprint,legacy:false,source:{provider:'native'}};
 }else{
  c=findComment(state,op.commentId,op.post);
  if(op.kind!=='approve')editable(c,op.actor);
  if(c.applied_requests?.[op.id]===op.fingerprint)return;
  if(op.expectedVersion&&op.expectedVersion!==commentVersion(c))fail(409,'version_conflict','댓글이 다른 요청으로 변경되었습니다. 최신 내용을 확인한 뒤 다시 시도해 주세요.');
  if(c.status==='deleted'){if(op.kind==='delete')return;fail(409,'deleted_comment','삭제된 댓글은 수정할 수 없습니다.');}
  if(op.kind==='delete'){c.status='deleted';c.body='';c.author={...c.author,link:''};}
  else if(op.kind==='edit'){c.body=op.body;if(op.name!==undefined&&!c.author.is_admin)c.author.name=op.name;if(op.link!==undefined)c.author.link=op.link;}
  else if(op.kind==='approve'){c.status='published';c._review_status='published';}
  else throw new Error('Unknown comment operation');
  c.updated_at=op.time;
 }
 // Keep replay receipts with the comment, including on its review branch.
 c.applied_requests??={};c.applied_requests[op.id]=op.fingerprint;
}
module.exports={applyOperation,commentVersion,published};
