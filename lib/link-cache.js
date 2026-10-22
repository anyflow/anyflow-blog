const fs=require('node:fs'),path=require('node:path'),dns=require('node:dns/promises'),net=require('node:net');
const {metadata,webUrl,METADATA_VERSION}=require('./link-preview');
const filename='.cache/link-previews.json';
function readLinkCache(root){
 const saved=path.join(root,'_assets/_meta/link-previews.json'),data=fs.existsSync(saved)?JSON.parse(fs.readFileSync(saved,'utf8')):{};
 const cached=fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')):{};
 for(const [url,value]of Object.entries(cached))if(!data[url]||Number(value.checkedAt||0)>Number(data[url].checkedAt||0))data[url]={...data[url],...value};
 return data;
}
async function request(url){
 for(let hop=0;hop<4;hop++){
  if(!webUrl(url))throw new Error('Invalid metadata URL');const u=new URL(url);
  const addresses=await dns.lookup(u.hostname,{all:true});
  if(!addresses.length||addresses.some(({address:a})=>net.isIP(a)===6?!/^2[0-9a-f]{3}:/i.test(a):/^(?:0|10|127|169\.254|192\.168|172\.(?:1[6-9]|2\d|3[01]))\./.test(a)))throw new Error('Metadata requires a public host');
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'User-Agent':'anyflow-blog','Accept':'application/json,text/html'}});
  if(response.status>=300&&response.status<400){url=new URL(response.headers.get('location'),url).href;continue;}
  if(!response.ok)throw new Error('HTTP '+response.status);
  let bytes=0,text='';const decoder=new TextDecoder();for await(const chunk of response.body){bytes+=chunk.length;if(bytes>1024*1024)throw new Error('Metadata response too large');text+=decoder.decode(chunk,{stream:true});}return text+decoder.decode();
 }throw new Error('Too many metadata redirects');
}
async function cacheLinks(urls,root,fetchText=request){
 const cache=readLinkCache(root),pending=[...new Set(urls)].filter(u=>cache[u]?.metadataVersion!==METADATA_VERSION||!cache[u]?.checkedAt||Date.now()-cache[u].checkedAt>86400000);
 async function worker(){while(pending.length){const url=pending.shift();try{cache[url]={...cache[url],...await metadata(url,fetchText),checkedAt:Date.now()};}catch(error){cache[url]={...cache[url],metadataVersion:METADATA_VERSION,checkedAt:Date.now()};console.warn('Link metadata '+url+': '+error.message);}}}
 await Promise.all(Array.from({length:Math.min(4,pending.length)},worker));fs.mkdirSync(path.dirname(filename),{recursive:true});const temp=filename+'.tmp';fs.writeFileSync(temp,JSON.stringify(cache,null,2)+'\n');fs.renameSync(temp,filename);return cache;
}
module.exports={readLinkCache,cacheLinks};
