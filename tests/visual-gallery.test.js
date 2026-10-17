const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moduleFixture={exports:{}};vm.runInNewContext(fs.readFileSync('integrations/obsidian-blog-links/visual-gallery.js','utf8'),{module:moduleFixture,require:()=>({Modal:class{constructor(app){this.app=app;}},Setting:class{},Notice:class{}})});
const {pageFor,cleanValue,save,VisualGallery}=moduleFixture.exports;
test('gallery opens current selection including relative paths and defaults missing values to page one',()=>{
 const items=Array.from({length:125},(_,i)=>({value:'_assets/_covers/'+String(i).padStart(3,'0')+'.png'}));assert.equal(pageFor(items,items[100].value),1);assert.equal(pageFor(items,''),0);assert.equal(pageFor(items,'missing.png'),0);assert.equal(cleanValue('![[one.png|200]]'),'one.png');
 const file={path:'cat/post.md'},app={vault:{getFiles:()=>items.map(item=>({path:item.value})),getResourcePath:file=>file.path},metadataCache:{getFileCache:()=>({frontmatter:{cover:'../_assets/_covers/100.png'}}),getFirstLinkpathDest:()=>({path:items[100].value})}};
 const modal=new VisualGallery({app},file,'cover');assert.equal(modal.page,1);assert.equal(modal.selected,items[100].value);
});
test('selection preserves other fields and rejects stale, deleted or invalid targets',async()=>{
 const file={path:'cat/post.md'},front={title:'Keep',cover:'old.png',icon:'🌼'};const app={vault:{getAbstractFileByPath:()=>file},metadataCache:{getFirstLinkpathDest:value=>value==='new.png'?{path:value}:null},fileManager:{processFrontMatter:async(target,fn)=>{assert.equal(target,file);fn(front);}}};
 await save(app,file,'cover','new.png','old.png');assert.equal(front.cover,'new.png');assert.equal(front.title,'Keep');assert.equal(front.icon,'🌼');
 await assert.rejects(save(app,file,'cover','new.png','old.png'),/변경/);await assert.rejects(save(app,file,'cover','missing.png','new.png'),/찾을/);await assert.rejects(save(app,file,'cover','javascript:alert(1)','new.png'),/이미지/);await assert.rejects(save(app,file,'icon','some text','🌼'),/이모지/);
 await save(app,file,'icon','🇰🇷','🌼');assert.equal(front.icon,'🇰🇷');await save(app,file,'icon','1️⃣','🇰🇷');await save(app,file,'icon','🧭','1️⃣');assert.equal(front.icon,'🧭');await save(app,file,'cover','','new.png');assert.equal(front.cover,'');
 app.vault.getAbstractFileByPath=()=>null;await assert.rejects(save(app,file,'icon','🌼','🧭'),/찾을/);
});

test('property picker blocks native pointer focus before opening a single gallery on click',async()=>{
 const registered={},module={exports:{}},file={path:'cat/post.md'},row={dataset:{propertyKey:'cover'}},value={closest:()=>row};let opened=0;
 vm.runInNewContext(fs.readFileSync('integrations/obsidian-blog-links/plugin.js','utf8'),{module,MutationObserver:class{observe(){}disconnect(){}},require:name=>name==='obsidian'?{Plugin:class{},Modal:class{}}:name==='./visual-gallery'?{VisualGallery:class{constructor(plugin,target,key){assert.equal(target,file);assert.equal(key,'cover');}open(){opened++;}}}:{}});
 const plugin=new module.exports();plugin.addCommand=plugin.register=plugin.registerEvent=plugin.registerMarkdownCodeBlockProcessor=plugin.registerMarkdownPostProcessor=()=>{};plugin.registerDomEvent=(el,type,handler,capture)=>{assert.equal(capture,true);registered[type]=handler;};
 plugin.app={vault:{config:{},getAbstractFileByPath:()=>null},metadataCache:{on:()=>{}},workspace:{containerEl:{querySelectorAll:()=>[]},getActiveFile:()=>null,getLeavesOfType:()=>[{view:{file,containerEl:{contains:()=>true}}}],on:()=>{}}};await plugin.onload();
 for(const type of ['pointerdown','mousedown','click']){const event={type,target:{closest:()=>value},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};registered[type](event);assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.equal(opened,type==='click'?1:0);}
 registered.click({type:'click',target:{closest:()=>value},preventDefault(){},stopImmediatePropagation(){}});assert.equal(opened,1);
 row.dataset.propertyKey='summary';let prevented=false;registered.pointerdown({type:'pointerdown',target:{closest:()=>value},preventDefault(){prevented=true;}});assert.equal(prevented,false);
});
