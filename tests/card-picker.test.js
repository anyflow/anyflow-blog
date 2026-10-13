const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{webcrypto}=require('node:crypto');
const pluginPath=path.join(__dirname,'../integrations/obsidian-card-image/main.js');
const {diagrams,withBlockId,socialEmbeds}=require('../integrations/obsidian-card-image/diagrams');
function fixture(text){
 let content=text,writes=0;const properties={title:'Keep title',cover:'keep.png'};
 const app={vault:{async process(file,fn){content=fn(content);}},fileManager:{async processFrontMatter(file,fn){writes++;fn(properties);}}};
 const module={exports:{}},localRequire=createRequire(pluginPath);
 vm.runInNewContext(fs.readFileSync(pluginPath,'utf8'),{module,crypto:webcrypto,require:name=>name==='obsidian'?{Plugin:class{constructor(app){this.app=app;}},Modal:class{},Component:class{},Notice:class{},MarkdownRenderer:{}}:localRequire(name)});
 return {plugin:new module.exports(app),properties,read:()=>content,writes:()=>writes};
}
test('gallery extracts nested Mermaid, preserves stable IDs and skips literal examples in code fences',()=>{
 const source='````md\n```mermaid\ngraph TD;EXAMPLE-->X;\n```\n````\n\n> ```mermaid\n> graph LR;ACTUAL-->Y;\n> ```\n> ^stable\n';
 const blocks=diagrams(source);assert.equal(blocks.length,1);assert.match(blocks[0].code,/ACTUAL/);assert.equal(blocks[0].id,'stable');assert.equal(withBlockId(source,blocks[0],'new'),source);
 const plain='Before\n\n> ```mermaid\n> graph TD;A-->B;\n> ```\n\nAfter\n';const diagram=diagrams(plain)[0],updated=withBlockId(plain,diagram,'card-stable');assert.match(updated,/> ```\n> \^card-stable\n\nAfter/);assert.equal(diagrams(updated)[0].id,'card-stable');assert.equal(updated.replace('> ^card-stable\n',''),plain);
 assert.throws(()=>withBlockId('```mermaid\ngraph TD;A-->B;',diagrams('```mermaid\ngraph TD;A-->B;')[0],'id'),/먼저 닫아/);
});
test('gallery writes only the selected thumbnail and gives Mermaid a persistent block ID',async()=>{
 const source='```mermaid\ngraph TD;A-->B;\n```\n',f=fixture(source),file={path:'post.md'};
 await f.plugin.select(file,source,{type:'mermaid',diagram:diagrams(source)[0]});assert.match(f.properties.thumbnail,/^\[\[#\^card-[\da-f]+\]\]$/);const id=f.properties.thumbnail.slice(4,-2);assert.equal(diagrams(f.read())[0].id,id);assert.equal(f.properties.cover,'keep.png');
 await f.plugin.select(file,f.read(),{type:'image',file:{path:'photos/a.webp'}});assert.equal(f.properties.thumbnail,'[[photos/a.webp]]');assert.equal(f.properties.title,'Keep title');
 await f.plugin.select(file,f.read(),null);assert.equal(f.properties.thumbnail,undefined);assert.equal(diagrams(f.read())[0].id,id);
});
test('gallery refuses a stale or unfinished Mermaid selection without overwriting the note',async()=>{
 const original='```mermaid\ngraph TD;A-->B;\n```\n',changed=original+'User update.\n',f=fixture(changed);
 await assert.rejects(f.plugin.select({},original,{type:'mermaid',diagram:diagrams(original)[0]}),/노트가 변경/);assert.equal(f.read(),changed);assert.equal(f.writes(),0);
 const incomplete='```mermaid\ngraph TD;A-->B;',g=fixture(incomplete);await assert.rejects(g.plugin.select({},incomplete,{type:'mermaid',diagram:diagrams(incomplete)[0]}),/먼저 닫아/);assert.equal(g.read(),incomplete);assert.equal(g.writes(),0);
});

test('YouTube gallery extracts real embeds, ignores code examples and stores the thumbnail URL',async()=>{
 const iframe='<iframe src="https://www.youtube.com/embed/yonRGtMDDH8?rel=0"></iframe>',source='```html\n'+iframe+'\n```\n\n'+iframe+'\n',videos=socialEmbeds(source);
 assert.equal(videos.length,1);assert.equal(videos[0].position,source.lastIndexOf(iframe));
 const f=fixture(source);await f.plugin.select({},source,videos[0]);assert.equal(f.properties.thumbnail,'https://i.ytimg.com/vi/yonRGtMDDH8/hqdefault.jpg');assert.equal(f.properties.cover,'keep.png');assert.equal(f.read(),source);
 const thumbnail=require('../lib/youtube');
 for(const url of ['https://youtu.be/yonRGtMDDH8','https://www.youtube.com/watch?v=yonRGtMDDH8','https://www.youtube-nocookie.com/embed/yonRGtMDDH8','https://youtube.com/shorts/yonRGtMDDH8'])assert.equal(thumbnail(url),videos[0].url);
 for(const url of ['https://youtube.com.evil.test/embed/yonRGtMDDH8','https://notyoutube.com/embed/yonRGtMDDH8','https://youtube.com/embed/invalid','javascript:alert(1)'])assert.equal(thumbnail(url),'');
});

test('X gallery extracts direct and Notion embeds and stores the selected photo URL',async()=>{
 const id='1717179344110358638',iframe='<iframe src="https://x.com/band/status/'+id+'"></iframe>',wrapped='<iframe src="https://embed.notion.co/api/iframe?app=1&amp;url='+encodeURIComponent('https://twitter.com/band/status/'+id)+'"></iframe>',source='```html\n'+iframe+'\n```\n\n'+iframe+'\n\n'+wrapped;
 const items=socialEmbeds(source);assert.equal(items.length,2);assert.equal(items[0].type,'x');assert.equal(items[0].id,id);assert.equal(items[0].position,source.lastIndexOf(iframe));
 items[0].url='https://pbs.twimg.com/media/F9SlgpVWkAAXsNw.jpg';const f=fixture(source);await f.plugin.select({},source,items[0]);assert.equal(f.properties.thumbnail,items[0].url);assert.equal(f.properties.cover,'keep.png');assert.equal(f.read(),source);
});
