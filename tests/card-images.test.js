const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildCardImages,readCardImages,cardImage,key}=require('../lib/card-images');
const tinyPNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=','base64');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'card-images-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,output:path.join(root,'site'),options:{cache:path.join(root,'cache'),file:path.join(root,'images.json')}};}
test('Mermaid and local vector cards generate PNGs, reuse cache and invalidate changed source',async t=>{
 const {root,output,options}=fixture(t),svg=path.join(root,'figure.svg');fs.writeFileSync(svg,'<svg/>');let calls=0;options.render=async()=>{calls++;return tinyPNG;};
 const diagram={url:'/diagram',thumbnail:'',thumbnailDiagram:'graph TD; A-->B;'},vector={url:'/vector',thumbnail:'/assets/figure.svg'};
 const content={posts:[diagram,vector],assets:new Map([[svg,vector.thumbnail]])};
 let map=await buildCardImages(content,output,options);assert.equal(calls,2);assert.match(cardImage(diagram,map),/^\/images\/cards\/[a-f0-9]{64}\.png$/);assert.equal(fs.readFileSync(path.join(output,map[key(diagram)])).subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.deepEqual(readCardImages(options.file),map);
 await buildCardImages(content,output,options);assert.equal(calls,2);
 diagram.thumbnailDiagram='graph TD; A-->C;';fs.writeFileSync(svg,'<svg>changed</svg>');await buildCardImages(content,output,options);assert.equal(calls,4);
});
test('ordinary photo, YouTube, X and bookmark card images use the identical URL in Open Graph',()=>{
 for(const thumbnail of ['/assets/photo.webp','https://i.ytimg.com/vi/yonRGtMDDH8/hqdefault.jpg','https://pbs.twimg.com/media/F9SlgpVWkAAXsNw.jpg','https://example.com/bookmark.png'])assert.equal(cardImage({thumbnail},{}),thumbnail);
 assert.equal(cardImage({thumbnail:''},{}),'');
});
test('render failure cannot replace the successful image manifest or publish invalid bytes',async t=>{
 const {output,options}=fixture(t);fs.writeFileSync(options.file,'{"previous":"retained"}');
 await assert.rejects(buildCardImages({posts:[{url:'/broken',thumbnailDiagram:'invalid graph'}],assets:new Map()},output,{...options,render:async()=>Buffer.from('invalid')}),/Card image \/broken: Invalid rendered PNG/);
 assert.deepEqual(readCardImages(options.file),{previous:'retained'});
});

test('non-web external image URLs are rejected before rendering',async t=>{
 const {output,options}=fixture(t);await assert.rejects(buildCardImages({posts:[{url:'/invalid',thumbnail:'file:///private.svg'}],assets:new Map()},output,options),/Invalid image URL/);
});
