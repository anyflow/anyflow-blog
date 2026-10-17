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
