const {validPostId,publicFile,validLikeTarget}=require('./post-key');
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {publicPost}=require('./model');
const safe=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(value);
async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
async function jsonFiles(directory){try{return (await fs.readdir(directory)).filter(file=>file.endsWith('.json')).sort();}catch(error){if(error.code==='ENOENT')return [];throw error;}}
async function readState(directory){
  const state={settings:await readJson(path.join(directory,'settings.json'),{moderation:false,legacyLikes:{}}),comments:{},likes:{}};
  for(const file of await jsonFiles(path.join(directory,'comments'))){
    const comment=await readJson(path.join(directory,'comments',file));
    if(!safe(comment?.id)||file!==comment.id+'.json'||!validPostId(comment.post_id))throw new Error('댓글 데이터 식별자가 올바르지 않습니다.');
    state.comments[comment.id]=comment;
  }
  for(const file of await jsonFiles(path.join(directory,'likes'))){
    const record=await readJson(path.join(directory,'likes',file));
    if(!validLikeTarget(record?.target))throw new Error('Like 데이터 대상이 올바르지 않습니다.');
    state.likes[record.target]=record.actors||{};
  }
  return state;
}
function publicData(state,postId){
  const result=publicPost(state,postId);
  return {comments:result.comments.map(({liked,can_edit,can_delete,...comment})=>comment),post_likes:result.post_likes};
}
async function exportPublic(directory,{approveMerged=false}={}){
  const state=await readState(directory);
  if(approveMerged){
    for(const file of await jsonFiles(path.join(directory,'requests'))){
      const request=await readJson(path.join(directory,'requests',file));
      if(!safe(request?.comment_id))throw new Error('승인 요청 식별자가 올바르지 않습니다.');
      const comment=state.comments[request.comment_id];
      if(comment?.status==='pending'){
        comment.status='published';
        await fs.writeFile(path.join(directory,'comments',comment.id+'.json'),JSON.stringify(comment,null,2)+'\n');
      }
    }
  }
  const posts=new Set(Object.values(state.comments).map(comment=>comment.post_id));
  for(const target of [...Object.keys(state.likes),...Object.keys(state.settings.legacyLikes||{})])if(target.startsWith('post:'))posts.add(target.slice(5));
  const output=path.join(directory,'public');
  await fs.mkdir(output,{recursive:true});
  // Prepare every file before replacing the publication directory.
  const generated=[];
  for(const postId of posts){
    if(!validPostId(postId))throw new Error('공개 댓글 글 식별자가 올바르지 않습니다.');
    generated.push([publicFile(postId),JSON.stringify(publicData(state,postId),null,2)+'\n']);
  }
  for(const [file,contents]of generated){await fs.writeFile(path.join(output,file+'.tmp'),contents);await fs.rename(path.join(output,file+'.tmp'),path.join(output,file));}
  for(const file of await jsonFiles(output))if(!generated.some(([name])=>name===file))await fs.rm(path.join(output,file));
  return {posts:posts.size,comments:Object.values(state.comments).filter(comment=>comment.status==='published').length};
}
module.exports={readState,publicData,exportPublic};
