const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const {createCommentsHandler}=require('../lib/comments/api'),{GitStore}=require('../lib/comments/git-store'),{QueueStore}=require('../lib/comments/queue-store');
const root=path.resolve(process.env.BLOG_STATIC_DIR||'_preview'),directory=path.resolve(process.env.COMMENTS_DATA_DIR||'.cache/comments-preview/data');
const configFile=path.resolve(process.env.COMMENTS_CONFIG||'.cache/comments-preview/config.json');
if(!fs.existsSync(configFile)){
 fs.mkdirSync(path.dirname(configFile),{recursive:true});fs.writeFileSync(configFile,JSON.stringify({secret:randomBytes(32).toString('hex'),adminToken:randomBytes(32).toString('hex')},null,2)+'\n',{mode:0o600});
}
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
const origins=(process.env.COMMENTS_ORIGINS||'http://127.0.0.1:8765,http://localhost:8765,http://127.0.0.1:18765,https://blog.anyflow.net,https://anyflow.net,https://www.anyflow.net').split(',');
const gitStore=new GitStore({directory,remote:process.env.COMMENTS_GIT_REMOTE||null,preview:process.env.COMMENTS_PREVIEW!=='false',recoverable:true});
const store=new QueueStore({store:gitStore,directory:path.resolve(process.env.COMMENTS_QUEUE_DIR||directory+'.queue')});
let handler,catalogStamp=0,lastRemote=0,catalogRefresh=null;
function setCatalog(catalog){
 if(!Array.isArray(catalog)||!catalog.length)throw new Error('Public post catalog is missing');
 handler=createCommentsHandler({store,catalog,secret:config.secret,adminToken:config.adminToken,adminName:'Hyunjeong Park',origins});
}
const catalogFile=path.join(root,'comments/catalog.json');
setCatalog(JSON.parse(fs.readFileSync(catalogFile,'utf8')));
async function refreshCatalog(){
 if(process.env.COMMENTS_CATALOG_URL){
  if(Date.now()-lastRemote<5000)return;lastRemote=Date.now();
  try{const response=await fetch(process.env.COMMENTS_CATALOG_URL,{signal:AbortSignal.timeout(3000)});if(!response.ok)throw new Error('Catalog HTTP '+response.status);setCatalog(await response.json());}catch(error){console.warn(error.message);}
 }else{
  const stamp=fs.statSync(catalogFile).mtimeMs;if(stamp!==catalogStamp){setCatalog(JSON.parse(fs.readFileSync(catalogFile,'utf8')));catalogStamp=stamp;}
 }
}
const types={'.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.mp3':'audio/mpeg','.mp4':'video/mp4','.pdf':'application/pdf'};
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/api/')&&req.method!=='GET'&&fs.existsSync(path.join(path.dirname(directory),'maintenance'))){res.writeHead(503,{'Content-Type':'application/json','Retry-After':'60'}).end(JSON.stringify({error:'maintenance',message:'댓글 데이터 이전 중입니다. 잠시 후 다시 시도해 주세요.'}));return;}
  if(req.url.startsWith('/api/')&&!catalogRefresh)catalogRefresh=refreshCatalog().catch(()=>console.warn('Public post catalog refresh failed.')).finally(()=>{catalogRefresh=null;});
  if(await handler(req,res))return;
  const url=new URL(req.url,'http://localhost');let decoded;
  try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
  if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(p=>p==='..'||p.startsWith('.'))){res.writeHead(404).end();return;}
  let file=path.resolve(root,'.'+decoded);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
  let stat;try{stat=fs.statSync(file);if(stat.isDirectory()){file=path.join(file,'index.html');stat=fs.statSync(file);}}catch{res.writeHead(404).end();return;}
  if(!stat.isFile()||!['GET','HEAD'].includes(req.method)){res.writeHead(404).end();return;}
  if(decoded!=='/'&&decoded.endsWith('/')){res.writeHead(301,{Location:url.pathname.replace(/\/+$/,'')+url.search}).end();return;}
  const real=fs.realpathSync(file);if(!real.startsWith(root+path.sep)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-cache');
  if(/^\/assets\/.*\.html$/i.test(decoded))res.setHeader('Content-Disposition','attachment');
  res.writeHead(200);if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'요청을 처리하지 못했습니다.'}));}
});
store.open().then(()=>server.listen(Number(process.env.PORT||18765),process.env.HOST||'127.0.0.1',()=>console.log('Blog preview and comments API ready.'))).catch(()=>{console.error('Comment queue initialization failed.');process.exitCode=1;});
async function stop(){server.close();await store.close();process.exit(0);}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
