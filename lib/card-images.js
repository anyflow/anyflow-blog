const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const manifest='.cache/card-images.json',cacheDirectory='.cache/card-images';
const hash=value=>createHash('sha256').update(value).digest('hex');
const key=post=>post.thumbnailDiagram?'mermaid:'+hash(post.thumbnailDiagram):'image:'+post.thumbnail;
const needsPNG=post=>Boolean(post.thumbnailDiagram||/\.(svg|ico|avif)(?:[?#]|$)/i.test(post.thumbnail||''));
function readCardImages(file=manifest){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};}
function cardImage(post,images){return needsPNG(post)?images[key(post)]||'':post.thumbnail||'';}
const png=bytes=>bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0;
async function buildCardImages(content,output,{cache=cacheDirectory,file=manifest,render}={}){
 const selected=content.posts.filter(needsPNG),images={};let browser;
 const vendor=path.resolve('src/js/vendor/mermaid.min.js');
 const profile=path.resolve('src/js/vendor/mermaid-profile.js');
 const version=hash(Buffer.concat([fs.readFileSync(__filename),fs.readFileSync(vendor),fs.readFileSync(profile)]));
 async function rasterize(type,source){
  if(!browser){const {default:puppeteer}=await import('puppeteer-core');const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(file=>fs.existsSync(file));if(!executablePath)throw new Error('Chromium is required for card image rendering');browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});}
  const page=await browser.newPage();
  try{
   await page.setViewport({width:1200,height:630,deviceScaleFactor:1});
   await page.setRequestInterception(true);page.on('request',request=>/^(data:|about:)/.test(request.url())?request.continue():request.abort());
   await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}#card{box-sizing:border-box;width:1200px;height:630px;padding:24px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:white}img{width:100%;height:100%;object-fit:contain}</style><div id="card"></div>');
   if(type==='mermaid'){
    await page.addScriptTag({content:fs.readFileSync(profile,'utf8')});
    await page.evaluate(async({source,library})=>{const card=document.getElementById('card'),renderer=blogMermaid.createRenderer(library);try{renderer.engine.initialize(blogMermaid.githubDefaults({securityLevel:'strict',theme:'default'}));card.innerHTML=(await renderer.engine.render('card-graph',source)).svg;}finally{renderer.dispose();}const svg=card.querySelector('svg');if(!svg)throw new Error('Missing Mermaid SVG');const box=svg.viewBox.baseVal;if(!box.width||!box.height)throw new Error('Empty Mermaid SVG');const scale=Math.min(1152/box.width,582/box.height);svg.style.maxWidth='none';svg.style.width=box.width*scale+'px';svg.style.height=box.height*scale+'px';},{source:source.toString(),library:fs.readFileSync(vendor,'utf8')});
   }else await page.evaluate(async({mime,data})=>{const image=document.createElement('img');image.src='data:'+mime+';base64,'+data;document.getElementById('card').append(image);await image.decode();},{mime:'image/'+(type==='svg'?'svg+xml':type==='ico'?'x-icon':type),data:source.toString('base64')});
   await page.evaluate(()=>document.fonts.ready);return Buffer.from(await page.screenshot({type:'png'}));
  }finally{await page.close();}
 }
 try{
  for(const post of selected){
   try{
    let type,source;
    if(post.thumbnailDiagram){type='mermaid';source=Buffer.from(post.thumbnailDiagram);}
    else{
     type=/\.(svg|ico|avif)(?:[?#]|$)/i.exec(post.thumbnail)[1].toLowerCase();
     const local=[...content.assets].find(([,url])=>url===post.thumbnail)?.[0];
     if(local)source=fs.readFileSync(local);
     else{
      const url=new URL(post.thumbnail);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid image URL');
      const response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Image HTTP '+response.status);
      const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>5*1024*1024)throw new Error('Card image exceeds 5 MiB');chunks.push(chunk);}source=Buffer.concat(chunks);
     }
    }
    const signature=hash(Buffer.concat([Buffer.from(version+type),source])),cached=path.join(cache,signature+'.png');
    let bytes=fs.existsSync(cached)?fs.readFileSync(cached):Buffer.alloc(0);
    if(!png(bytes)){bytes=await(render||rasterize)(type,source);if(!png(bytes))throw new Error('Invalid rendered PNG');fs.mkdirSync(cache,{recursive:true});fs.writeFileSync(cached+'.tmp',bytes);fs.renameSync(cached+'.tmp',cached);}
    const url='/images/cards/'+hash(bytes)+'.png',target=path.join(output,url);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(cached,target);images[key(post)]=url;
   }catch(error){throw new Error('Card image '+post.url+': '+error.message);}
  }
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(images,null,2)+'\n');fs.renameSync(file+'.tmp',file);return images;
 }finally{if(browser)await browser.close();}
}
module.exports={buildCardImages,readCardImages,cardImage,key};
