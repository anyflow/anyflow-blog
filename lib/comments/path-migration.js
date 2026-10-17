'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const {validPostId}=require('./post-key');
function idMap(plan,reverse=false){return reverse?Object.fromEntries(Object.entries(plan.ids).map(([a,b])=>[b,a])):plan.ids;}
function mapped(value,ids,reverse=false){
 if(value===undefined||value===null)return value;
 if(ids[value])return ids[value];
 if(reverse&&value.startsWith('/'))return createHash('sha256').update(value).digest('hex').slice(0,32);
 if(!reverse&&value.startsWith('/')&&validPostId(value))return value;
 throw new Error('Unmapped post ID: '+value);
}
function transformState(state,plan,reverse=false){
 const result=structuredClone(state),ids=idMap(plan,reverse);
 for(const comment of Object.values(result.comments||{}))comment.post_id=mapped(comment.post_id,ids,reverse);
 const targets=values=>Object.fromEntries(Object.entries(values||{}).map(([key,value])=>[key.startsWith('post:')?'post:'+mapped(key.slice(5),ids,reverse):key,value]));
 result.likes=targets(result.likes);result.settings.legacyLikes=targets(result.settings.legacyLikes);
 return result;
}
function transformQueue(record,plan,reverse=false){
 const result=structuredClone(record),ids=idMap(plan,reverse);if(result.jobs.length)throw new Error('Drain the accepted queue before migration');
 result.base=transformState(result.base,plan,reverse);
 for(const receipt of Object.values(result.receipts||{}))if(receipt.post)receipt.post=mapped(receipt.post,ids,reverse);
 for(const field of ['sequences','sequenceTimes'])if(result[field])result[field]=Object.fromEntries(Object.entries(result[field]).map(([key,value])=>{const match=/^(.*:post:)(.*)(:[^:]+)$/.exec(key);return [match?match[1]+mapped(match[2],ids,reverse)+match[3]:key,value];}));
 result.revision++;return result;
}
async function filenames(directory){try{return await fs.readdir(directory);}catch(error){if(error.code==='ENOENT')return [];throw error;}}
async function migrateRepository(root,plan,reverse=false){
 const {readState,exportPublic}=require('./export'),ids=idMap(plan,reverse),before=await readState(root),after=transformState(before,plan,reverse);
 for(const comment of Object.values(after.comments))await fs.writeFile(path.join(root,'comments',comment.id+'.json'),JSON.stringify(comment,null,2)+'\n');
 for(const file of await filenames(path.join(root,'likes'))){if(!file.endsWith('.json'))continue;const record=JSON.parse(await fs.readFile(path.join(root,'likes',file)));if(record.target.startsWith('post:')){record.target='post:'+mapped(record.target.slice(5),ids,reverse);const next=createHash('sha256').update(record.target).digest('hex')+'.json';await fs.writeFile(path.join(root,'likes',next),JSON.stringify(record,null,2)+'\n');if(next!==file)await fs.unlink(path.join(root,'likes',file));}}
 await fs.writeFile(path.join(root,'settings.json'),JSON.stringify(after.settings,null,2)+'\n');
 const requests=path.join(root,'requests');for(const file of await filenames(requests)){if(!file.endsWith('.json'))continue;const data=JSON.parse(await fs.readFile(path.join(requests,file)));data.post_id=mapped(data.post_id,ids,reverse);await fs.writeFile(path.join(requests,file),JSON.stringify(data,null,2)+'\n');}
 const summary=await exportPublic(root);return {before,after,summary};
}
module.exports={mapped,transformState,transformQueue,migrateRepository};
