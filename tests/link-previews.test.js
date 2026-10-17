const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const links=require('../lib/link-preview'),bookmark=require('../lib/bookmark');
test('GitHub preview and mentions escape metadata and preserve safe targets',()=>{
 assert.match(bookmark({url:'https://github.com/a/b',type:'preview',title:'<Title>',avatar:'javascript:bad'}),/github-preview/);
 assert.match(links.preview('https://github.com/a/b',{title:'<Title>'}),/&lt;Title&gt;/);
 assert.equal(links.preview('https://example.com',{}),'');
 assert.equal(links.githubResource('https://github.com.evil.test/a/b'),null);
 assert.equal(links.githubResource('https://github.com/a/b/blob/main/src/index.js').kind,'file');
 const mention=links.mention('https://github.com/a/b/issues/1',{title:'A & B',kind:'issue',number:'1',state:'closed',icon:'javascript:bad'});
 assert.match(mention,/A &amp; B/);assert.match(mention,/#1/);assert.match(mention,/Closed/);assert.doesNotMatch(mention,/javascript/);
 assert.throws(()=>links.mention('javascript:alert(1)'),/Invalid/);
 assert.equal(links.pageMetadata('<title>No image</title>','https://example.com').cover,'');
 assert.deepEqual(links.pageMetadata('<meta content="A &amp; B" property="og:title"><meta property="og:image" content="/a.png">','https://example.com').title,'A & B');
});
test('metadata fetch uses service-specific fields and public page fallbacks',async()=>{
 const data=await links.metadata('https://github.com/a/b/issues/1',async url=>{assert.equal(url,'https://api.github.com/repos/a/b/issues/1');return JSON.stringify({title:'issue',number:1,state:'open',user:{avatar_url:'https://example.com/a.png'}});});
 assert.equal(data.kind,'issue');assert.equal(data.state,'open');assert.equal(data.number,'1');
 const page=await links.metadata('https://example.com',async()=>'<title>Website</title>');assert.equal(page.title,'Website');
});
test('explicit mentions stay inline, previews support captions, ordinary links remain unchanged',()=>{
 const md=require('markdown-it')({html:true}).use(require('../lib/obsidian-markdown'));
 const url='https://github.com/a/b/issues/1',env={post:{},linkRequests:new Set(),linkMetadata:{[url]:{title:'Issue',kind:'issue',number:'1',state:'closed'}}};
 const html=md.render('- [saved](<'+url+'> "mention")\n\n[ordinary](https://example.com)\n\n```cardlink\nurl: https://github.com/a/b\ntype: preview\n```\n\n> [!caption]\n> Caption',env);
 assert.match(html,/<li><a class="link-mention"/);assert.match(html,/Issue/);assert.match(html,/<a href="https:\/\/example.com">ordinary<\/a>/);assert.match(html,/github-preview/);assert.match(html,/<figcaption class="caption">/);
 assert.ok(env.linkRequests.has(url));
});
test('paste menu is limited to single URLs outside code and preserves selected text',()=>{
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../integrations/obsidian-blog-links/plugin.js'),'utf8'),{module,require:n=>n==='obsidian'?{Plugin:class{},Modal:class{}}:n==='./bookmark'?bookmark:links});
 const candidate=module.exports.pasteCandidate,view={app:{metadataCache:{getFileCache:()=>({})}},file:{}};
 const editor={somethingSelected:()=>false,getCursor:()=>({line:0,ch:0}),getValue:()=>''};
 const e={clipboardData:{getData:()=> 'https://example.com'}};
 assert.equal(candidate(e,editor,view),'https://example.com/');
 assert.equal(candidate(e,{...editor,somethingSelected:()=>true},view),'');
 assert.equal(candidate({...e,clipboardData:{getData:()=> 'https://a.com\nhttps://b.com'}},editor,view),'');
 assert.equal(candidate(e,{...editor,getValue:()=> '```js'},view),'');
 assert.equal(candidate(e,{...editor,getValue:()=> '`code',getCursor:()=>({line:0,ch:5})},view),'');
 assert.equal(candidate(e,{...editor,getValue:()=> 'code',getCursor:()=>({line:2})},{...view,app:{metadataCache:{getFileCache:()=>({sections:[{type:'code',position:{start:{line:1},end:{line:3}}}]})}}}),'');
});
test('metadata completion cannot replace a URL changed by the author',async()=>{
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../integrations/obsidian-blog-links/plugin.js'),'utf8'),{module,require:n=>n==='obsidian'?{Plugin:class{},Modal:class{},Notice:class{}}:n==='./bookmark'?bookmark:links});
 const p=new module.exports();p.cache={'https://example.com':{checkedAt:Date.now(),title:'Example'}};p.app={workspace:{getActiveFile:()=>({path:'note.md'})}};
 let replacements=0;await p.choose('mention','https://example.com',{getRange:()=> 'new text',replaceRange:()=>replacements++},{line:0,ch:0},{line:0,ch:19},{path:'note.md'});assert.equal(replacements,0);
});

test('failed metadata refresh retains source information and avoids repeated requests',async()=>{
 const previous=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'link-cache-'));
 try{
  process.chdir(root);fs.mkdirSync('_assets/_meta',{recursive:true});fs.writeFileSync('_assets/_meta/link-previews.json',JSON.stringify({'https://example.com':{title:'Preserved'}}));
  const {cacheLinks}=require('../lib/link-cache');let calls=0;const fail=async()=>{calls++;throw new Error('offline');};
  const data=await cacheLinks(['https://example.com'],root,fail);assert.equal(data['https://example.com'].title,'Preserved');
  await cacheLinks(['https://example.com'],root,fail);assert.equal(calls,1);
 }finally{process.chdir(previous);fs.rmSync(root,{recursive:true,force:true});}
});

test('per-note attachment folders do not write tracked application settings on every file switch',async()=>{
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../integrations/obsidian-blog-links/plugin.js'),'utf8'),{module,MutationObserver:class{observe(){} disconnect(){}},require:n=>n==='obsidian'?{Plugin:class{},Modal:class{}}:n==='./bookmark'?bookmark:links});
 const p=new module.exports(),events={},config={attachmentFolderPath:'_assets'};let active={extension:'md',path:'cat/one.md'},writes=0;
 p.addCommand=p.register=p.registerEvent=p.registerMarkdownCodeBlockProcessor=p.registerMarkdownPostProcessor=()=>{};
 p.app={vault:{config,getAbstractFileByPath:()=>null,setConfig:()=>writes++},workspace:{containerEl:{querySelectorAll:()=>[]},getActiveFile:()=>active,on:(n,f)=>events[n]=f},metadataCache:{on:(n,f)=>events[n]=f}};
 await p.onload();assert.equal(config.attachmentFolderPath,'_assets/cat/one');active={extension:'md',path:'cat/two.md'};events['file-open'](active);assert.equal(config.attachmentFolderPath,'_assets/cat/two');assert.equal(writes,0);
});

test('category selection reads current notes and saves only the chosen note category',async()=>{
 const options=[],notices=[];class Menu{addItem(fn){const item={setTitle(v){this.title=v;return this;},setChecked(v){this.checked=v;return this;},onClick(fn){this.choose=fn;return this;}};fn(item);options.push(item);}showAtPosition(){}}
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../integrations/obsidian-blog-links/plugin.js'),'utf8'),{module,require:n=>n==='obsidian'?{Plugin:class{},Modal:class{},Menu,Notice:class{constructor(s){notices.push(s);}}}:n==='./bookmark'?bookmark:links});
 const file={path:'cat/one.md'},other={path:'cat/two.md'},template={path:'_templates/template.md'},current={category:'One',title:'Preserve',draft:true},second={category:'Two'};
 const notes=new Map([[file,current],[other,second],[template,{category:'Private'}]]);let saved;
 const p=new module.exports();p.app={vault:{getMarkdownFiles:()=>[...notes.keys()],getAbstractFileByPath:()=>file},metadataCache:{getFileCache:f=>({frontmatter:notes.get(f)})},fileManager:{processFrontMatter:async(f,fn)=>{saved=f;fn(notes.get(f));}}};
 p.categoryMenu(file,{x:0,y:0});assert.deepEqual(options.map(x=>x.title).sort(),['One','Two']);assert.ok(options.find(x=>x.title==='One').checked);
 await options.find(x=>x.title==='Two').choose();assert.equal(saved,file);assert.deepEqual(current,{category:'Two',title:'Preserve',draft:true});assert.deepEqual(second,{category:'Two'});assert.equal(notices.length,0);
 options.length=0;second.category='New';p.categoryMenu(file,{x:0,y:0});assert.ok(options.some(x=>x.title==='New'));
});
