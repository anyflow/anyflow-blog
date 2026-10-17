const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {xPostId,xThumbnail}=require('../lib/x'),{readXCache,cacheXThumbnails}=require('../lib/x-cache');
const id='1717179344110358638',image='https://pbs.twimg.com/media/F9SlgpVWkAAXsNw.jpg';
test('X post URLs unwrap Notion embeds and validate the returned image host',async()=>{
 const url='https://x.com/dreamtheaternet/status/'+id+'?s=20';
 for(const raw of [url,url.replace('x.com','twitter.com'),'https://embed.notion.co/api/iframe?app=1&amp;url='+encodeURIComponent(url)+'&amp;key=test'])assert.equal(xPostId(raw),id);
 for(const raw of ['https://x.com.evil.test/a/status/'+id,'https://notx.com/a/status/'+id,'javascript:alert(1)'])assert.equal(xPostId(raw),'');
 assert.equal(await xThumbnail(id,async()=>({id_str:id,photos:[{url:image}]})),image);
 assert.equal(await xThumbnail(id,async()=>({id_str:id})),null);
 await assert.rejects(xThumbnail(id,async()=>({id_str:id,photos:[{url:'https://evil.test/photo.jpg'}]})),/잘못된/);
 await assert.rejects(xThumbnail(id,async()=>({})),/확인할 수 없습니다/);
});
test('X preview cache reuses resolved posts and preserves cached results after a failed lookup',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-x-')),file=path.join(root,'cache.json');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));let calls=0;
 const request=async()=>{calls++;return {id_str:id,photos:[{url:image}]};};
 await cacheXThumbnails([id,id],request,file);await cacheXThumbnails([id],request,file);assert.equal(calls,1);assert.equal(readXCache(file)[id],image);
 const cached=await cacheXThumbnails(['123'],async()=>({id_str:'123'}),file);assert.equal(cached['123'],null);
 const failed=await cacheXThumbnails(['456'],async()=>{throw new Error('unavailable');},file);assert.equal(failed[id],image);assert.equal(Object.hasOwn(failed,'456'),false);assert.equal(readXCache(file)[id],image);
});

test('native X embed keeps card image lookup without Notion',()=>{
 assert.equal(xPostId('https://platform.twitter.com/embed/Tweet.html?id=1717179344110358638&dnt=true'),'1717179344110358638');
 for(const url of ['https://platform.twitter.com.evil.test/embed/Tweet.html?id=123','https://platform.twitter.com/embed/Tweet.html?id=invalid','http://platform.twitter.com/embed/Tweet.html?id=123'])assert.equal(xPostId(url),'');
});
