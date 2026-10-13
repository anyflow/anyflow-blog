const fs=require('node:fs'),path=require('node:path'),{xThumbnail}=require('./x');
const defaultFile='.cache/x-thumbnails.json';
function readXCache(file=defaultFile){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};}
async function cacheXThumbnails(ids,requestJSON=async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('HTTP '+response.status);return response.json();},file=defaultFile){
 const cache=readXCache(file);let changed=false;
 for(const id of new Set(ids)){
  // shortcut: 같은 게시물 ID의 이미지는 고정으로 취급한다. 수정 반영이 필요하면 캐시 갱신을 추가한다.
  if(Object.hasOwn(cache,id))continue;
  try{cache[id]=await xThumbnail(id,requestJSON);changed=true;}catch(error){console.warn('X card '+id+': '+error.message);}
 }
 if(changed){fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify(cache,null,2)+'\n');fs.renameSync(temporary,file);}
 return cache;
}
module.exports={readXCache,cacheXThumbnails};
