const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {loadContent}=require('../lib/content');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'anyflow-blog-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function post(root,name,overrides={},body='## Introduction\n\nText.'){const dir=path.join(root,name);fs.mkdirSync(dir,{recursive:true});const values={title:name,permalink:'/'+name,created:'2025-01-01',category:'test',kind:'post',draft:false,...overrides};const file=path.join(dir,name+'.md');fs.writeFileSync(file,'---\n'+Object.entries(values).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\n\n'+body);return file;}
test('only published notes and referenced assets, correct legacy paths and dates',t=>{
 const root=fixture(t);
 const source=post(root,'first',{},'## Introduction\n\n![Photo](obsolete folder/image(1).png)\n\nPhoto\n\n[Other](../other/other.md)\n\n[other](../other/other.md)\n\n## Introduction\n\n```html\n<img src="do-not-touch.png">\n```\n\n```mermaid\ngraph TD; A-->B;\n```\n\n> 💡 Callout text.');
 fs.writeFileSync(path.join(path.dirname(source),'image(1).png'),'image');
 fs.writeFileSync(path.join(path.dirname(source),'unused.png'),'unused');
 post(root,'other',{created:'2026-01-01'});
 post(root,'draft',{draft:true},'DO_NOT_PUBLISH');
 fs.writeFileSync(path.join(root,'unindexed.md'),'PRIVATE_NOTE');
 fs.writeFileSync(path.join(root,'.mcp.json'),'LOCAL_CONFIGURATION');
 const result=loadContent(root,path.join(root,'no-visuals.json'));
 assert.deepEqual(result.posts.map(p=>p.title),['other','first']);
 const first=result.posts[1];
 assert.match(first.html,/src="\/assets\/first\/image\(1\)\.png"/);
 assert.match(first.html,/href="\/other"/);
 assert.match(first.html,/class="page-mention"/);
 assert.match(first.html,/class="page-mention-title">other<\/span><\/a>/);
 assert.match(first.html,/class="caption"/);
 assert.match(first.html,/do-not-touch\.png/);
 assert.match(first.html,/class="mermaid"/);
 assert.match(first.html,/<blockquote class="callout"><span class="callout-icon"[^>]*>💡<\/span><div class="callout-content"><p>Callout text./);
 assert.deepEqual(first.toc.map(t=>t.id),['introduction','introduction-2']);
 assert.equal(result.assets.size,1);
 assert.equal(first.thumbnail,'/assets/first/image(1).png');
 assert.equal(result.unresolved.length,0);
 assert.doesNotMatch(first.preview,/<a\b|\sid=/);
 assert.ok(!JSON.stringify(result.posts).includes('DO_NOT_PUBLISH'));
});
test('invalid or duplicate public URLs stop the build',t=>{
 const root=fixture(t);post(root,'first');post(root,'second',{permalink:'/first',post_id:'second-post-123'});
 assert.throws(()=>loadContent(root),/Duplicate permalink/);
 for(const permalink of ['/../outside','/%2e%2e/outside','/%252e%252e/outside','/first//second','/']){
  const other=fixture(t);post(other,'bad',{permalink});
  assert.throws(()=>loadContent(other),/Invalid permalink/);
 }
});
test('noindex is an explicit boolean setting, not a truthy string',t=>{
 const root=fixture(t);post(root,'first',{noindex:true});assert.equal(loadContent(root,path.join(root,'none')).posts[0].noindex,true);
 post(root,'first',{noindex:false});assert.equal(loadContent(root,path.join(root,'none')).posts[0].noindex,false);
 for(const noindex of ['false',1,null]){post(root,'first',{noindex});assert.throws(()=>loadContent(root),/noindex must be a boolean/);}
});
test('author titles and summaries keep quotes, ampersands and code text after Markdown rendering',t=>{
 const root=fixture(t);post(root,'first',{title:'검증 "한글" & 기호',summary:'**요약** & `Array<T>`'});
 const current=loadContent(root,path.join(root,'none')).posts[0];assert.equal(current.title,'검증 "한글" & 기호');assert.equal(current.summary,'요약 & Array<T>');
});

test('author metadata takes priority over captured reference metadata',t=>{
 const root=fixture(t), file=post(root,'first',{tags:['new'],icon:'⭐',cover:'./cover.png',cover_position:'50% 20%'});
 fs.writeFileSync(path.join(path.dirname(file),'cover.png'),'cover');
 const visuals=path.join(root,'visuals.json');
 fs.writeFileSync(visuals,JSON.stringify({'/first':{icon:'📝',cover:'/old-cover.png',properties:[{text:'test'},{text:'Old'}]}}));
 const current=loadContent(root,visuals).posts[0];
 assert.deepEqual(current.tags,['new']);assert.equal(current.icon,'⭐');
 assert.equal(current.cover,'/assets/first/cover.png');assert.equal(current.coverPosition,'50% 20%');
});
test('attachments cannot escape the content root through a symlink',t=>{
 const root=fixture(t), outside=fixture(t), file=post(root,'first',{},'![private](./private.png)');
 fs.writeFileSync(path.join(outside,'secret.png'),'DO_NOT_COPY');
 fs.symlinkSync(path.join(outside,'secret.png'),path.join(path.dirname(file),'private.png'));
 const result=loadContent(root,path.join(root,'no-visuals.json'));
 assert.equal(result.assets.size,0);assert.equal(result.unresolved.length,1);
 assert.doesNotMatch(result.posts[0].html,/DO_NOT_COPY/);
});

test('local cover and icon assets, emoji catalog, home metadata and explicit clearing',t=>{
 const root=fixture(t),source=post(root,'first',{icon:'📌',cover:'./cover.webp',cover_position:'50% 20%'});
 fs.writeFileSync(path.join(path.dirname(source),'cover.webp'),'cover image');
 const visuals=path.join(root,'_assets/visuals');fs.mkdirSync(path.join(visuals,'icons'),{recursive:true});
 fs.writeFileSync(path.join(visuals,'icons/pin.webp'),'emoji image');
 fs.writeFileSync(path.join(visuals,'manifest.json'),JSON.stringify({emojis:{'📌':'icons/pin.webp'}}));
 const home=post(root,'home',{kind:'page',permalink:'/',icon:'🌼',cover:'./home.png',cover_position:'50% 0%'});
 fs.writeFileSync(path.join(path.dirname(home),'home.png'),'home image');
 const custom=post(root,'custom',{icon:'./custom.svg'});fs.writeFileSync(path.join(path.dirname(custom),'custom.svg'),'<svg/>');
 post(root,'native',{icon:'🫧'});post(root,'cleared',{icon:'',cover:''});
 const reference=path.join(root,'reference.json');fs.writeFileSync(reference,JSON.stringify({'/cleared':{icon:'📝',cover:'/old.png'}}));
 const result=loadContent(root,reference),first=result.posts.find(p=>p.title==='first');
 assert.equal(first.icon,'📌');assert.equal(first.iconImage,'/assets/_assets/visuals/icons/pin.webp');
 assert.equal(first.cover,'/assets/first/cover.webp');assert.equal(first.coverPosition,'50% 20%');
 assert.equal(result.home.cover,'/assets/home/home.png');assert.equal(result.home.coverPosition,'50% 0%');
 const image=result.posts.find(p=>p.title==='custom');assert.equal(image.iconIsImage,true);assert.equal(image.iconImage,'/assets/custom/custom.svg');
 assert.equal(result.posts.find(p=>p.title==='native').icon,'🫧');assert.equal(result.posts.find(p=>p.title==='native').iconImage,'');
 const cleared=result.posts.find(p=>p.title==='cleared');assert.equal(cleared.icon,'');assert.equal(cleared.cover,'');
 assert.equal(result.assets.size,4);assert.equal(result.posts.length,4);assert.equal(result.unresolved.length,0);
 assert.ok([...result.assets.keys()].every(p=>!p.endsWith('.json')));
 fs.unlinkSync(path.join(visuals,'icons/pin.webp'));assert.throws(()=>loadContent(root,reference),/Missing icon attachment/);
 fs.writeFileSync(path.join(visuals,'icons/pin.webp'),'emoji image');fs.unlinkSync(path.join(path.dirname(source),'cover.webp'));assert.throws(()=>loadContent(root,reference),/Missing cover attachment/);
});

test('Pixel Banner image links and numeric crop coordinates match the published page',t=>{
 const root=fixture(t),source=post(root,'pixel',{cover:'![[pixel/cover full.webp]]',cover_x:0,cover_y:100,cover_position:'50% 25%',icon:'⭐',icon_image:'[[pixel/pin.svg]]'});
 fs.writeFileSync(path.join(path.dirname(source),'cover full.webp'),'cover');fs.writeFileSync(path.join(path.dirname(source),'pin.svg'),'<svg/>');
 const current=loadContent(root,path.join(root,'none.json')).posts[0];
 assert.equal(current.cover,'/assets/pixel/cover%20full.webp');assert.equal(current.coverPosition,'0% 100%');
 assert.equal(current.iconImage,'/assets/pixel/pin.svg');assert.equal(current.iconIsImage,true);
 const registry=path.join(root,'_assets/visuals');fs.mkdirSync(registry,{recursive:true});fs.writeFileSync(path.join(registry,'manifest.json'),JSON.stringify({emojis:{},pages:{'/pixel':{}}}));
 post(root,'pixel',{});const cleared=loadContent(root,path.join(root,'none.json')).posts[0];assert.equal(cleared.icon,'');assert.equal(cleared.cover,'');
 for(const value of [-1,101,'invalid']){
  const bad=fixture(t);post(bad,'bad',{cover_y:value});assert.throws(()=>loadContent(bad),/Cover position must be between/);
 }
});

test('cover crop defaults to center without coordinates, preserves explicit and legacy positions',t=>{
 const root=fixture(t),cases=[
  ['automatic',{},'50% 50%'],
  ['blank',{cover_x:'',cover_y:'  '},'50% 50%'],
  ['partial',{cover_x:0,cover_y:''},'0% 50%'],
  ['vertical',{cover_x:null,cover_y:100},'50% 100%'],
  ['legacy',{cover_position:'25% 75%'},'25% 75%'],
  ['legacy-partial',{cover_position:'25% 75%',cover_x:'',cover_y:0},'25% 0%']
 ];
 for(const [name,data] of cases){
  const source=post(root,name,{cover:'./cover.png',...data});
  fs.writeFileSync(path.join(path.dirname(source),'cover.png'),'cover');
 }
 const home=post(root,'home',{kind:'page',permalink:'/',cover:'./cover.png'});
 fs.writeFileSync(path.join(path.dirname(home),'cover.png'),'cover');
 const reference=path.join(root,'reference.json');
 fs.writeFileSync(reference,JSON.stringify({'/automatic':{coverPosition:'0% 0%'},'/':{coverPosition:'0% 0%'}}));
 const result=loadContent(root,reference);
 for(const [name,,expected] of cases) assert.equal(result.posts.find(p=>p.title===name).coverPosition,expected);
 assert.equal(result.home.coverPosition,'50% 50%');
 assert.equal(result.unresolved.length,0);
});

test('native Obsidian callouts preserve nested quotes, folding, figures and math',t=>{
 const root=fixture(t),file=post(root,'native',{},'> [!notion]\n>\n> **Title**\n>\n> Body.\n>\n> > Nested quotation.\n\n> [!info] Custom title\n> More information.\n\n> [!warning]- Collapsed\n> Hidden details.\n\n![First paragraph. Second paragraph.|528](<image one.png>)\n\nFirst paragraph.\n\nSecond paragraph.\n\nAfter caption.\n\n$$\n\\frac{a}{b}=c\n$$\n\nInline $x^2$.\n\n^equation\n\n[Jump](#^equation)\n\n![[native/image one.png|240]]');
 fs.writeFileSync(path.join(path.dirname(file),'image one.png'),'image');
 const result=loadContent(root,path.join(root,'no.json')),html=result.posts[0].html;
 assert.match(html,/<blockquote class="callout">[\s\S]*<strong>Title<\/strong>[\s\S]*<blockquote>[\s\S]*Nested quotation/);
 assert.match(html,/<div class="callout-title">Custom title<\/div>/);
 assert.match(html,/<details class="callout" data-callout="warning">/);
 assert.doesNotMatch(html,/\[!|\^\w+<\/p>/);
 assert.match(html,/<figure style="width:528px;max-width:100%">[\s\S]*<figcaption>[\s\S]*<p class="caption">First paragraph\.<\/p>[\s\S]*Second paragraph\.<\/p><\/figcaption><\/figure>\s*<p>After caption/);
 assert.match(html,/class="katex-display"/);
 assert.match(html,/id="equation"/);assert.match(html,/href="#equation"/);
 assert.equal(result.unresolved.length,0);
});
test('an unsupported image format stops publication, audio remains a media element',t=>{
 const root=fixture(t),file=post(root,'media',{},'![](voice.mp3)');
 fs.writeFileSync(path.join(path.dirname(file),'voice.mp3'),'audio');
 assert.match(loadContent(root,path.join(root,'none')).posts[0].html,/<audio controls preload="metadata" src="\/assets\/media\/voice.mp3"/);
 fs.writeFileSync(path.join(path.dirname(file),'photo.heic'),'heic');
 post(root,'media',{},'![](photo.heic)');assert.throws(()=>loadContent(root,path.join(root,'none')),/Unsupported web image format/);
});


test('malformed export syntax and frontmatter are rejected, literal examples are allowed',t=>{
 const root=fixture(t),file=post(root,'bad',{},'![caption first.\n\ncaption second.](image.png)');
 fs.writeFileSync(path.join(path.dirname(file),'image.png'),'image');
 assert.throws(()=>loadContent(root,path.join(root,'none')),/Malformed Markdown/);
 post(root,'bad',{},'\\!\\[example\\] and \x60![code example]\x60');loadContent(root,path.join(root,'none'));
 const raw=fs.readFileSync(file,'utf8');fs.writeFileSync(file,raw.replace('\n---\n\n','\n---'));
 assert.throws(()=>loadContent(root,path.join(root,'none')),/Invalid frontmatter delimiter/);
});

test('Obsidian columns retain ratios, captions and nested content',t=>{
 const root=fixture(t),file=post(root,'columns',{},'> [!columns]\n>\n> > [!column|0.25]\n> >\n> > ![First](a.png) ^photo\n> >\n> > First\n>\n> > [!column|0.25]\n> >\n> > ## Middle\n> >\n> > Middle text.\n>\n> > [!column|0.5]\n> >\n> > > A quote.');
 fs.writeFileSync(path.join(path.dirname(file),'a.png'),'image');
 const result=loadContent(root,path.join(root,'none')),html=result.posts[0].html;
 assert.equal((html.match(/class="notion-columns"/g)||[]).length,1);
 assert.deepEqual([...html.matchAll(/class="notion-column" style="--column-ratio:([^"]+)"/g)].map(m=>Number(m[1])),[.25,.25,.5]);
 assert.match(html,/<figcaption>[\s\S]*First/);assert.match(html,/<h2 id="middle">Middle/);assert.match(html,/<blockquote>[\s\S]*A quote/);
 assert.match(html,/id="photo"/);assert.doesNotMatch(html,/\^photo/);
 assert.doesNotMatch(html,/\[!column|callout-icon/);
 post(root,'columns',{},'> [!column|bad]\n> Text.');assert.throws(()=>loadContent(root,path.join(root,'none')),/Invalid column ratio/);
});
test('the home favicon is a referenced asset declared on home and post pages',t=>{
 const root=fixture(t),file=post(root,'first'),home=post(root,'home',{kind:'page',permalink:'/',favicon:'./favicon.png'});
 fs.writeFileSync(path.join(path.dirname(home),'favicon.png'),'favicon');
 const result=loadContent(root,path.join(root,'none'));assert.equal(result.home.favicon,'/assets/home/favicon.png');assert.equal(result.assets.size,1);
 const nunjucks=require('nunjucks'),env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve(__dirname,'../src/_includes')));
 env.addFilter('versionedAsset',s=>s);env.addFilter('tagColor',()=>"#fff");env.addFilter('tagStyle',()=>"");
 for(const post of [null,result.posts[0]]){
  const html=env.render('base.njk',{home:result.home,site:{title:'Blog'},post,content:''});
  assert.match(html,/<link rel="icon" href="\/assets\/home\/favicon.png">/);assert.match(html,/<link rel="apple-touch-icon"/);
 }
 fs.unlinkSync(path.join(path.dirname(home),'favicon.png'));assert.throws(()=>loadContent(root,path.join(root,'none')),/Missing favicon attachment/);
});

test('cards use the first image or Mermaid in body order and ignore obsolete export hints',t=>{
 const root=fixture(t),cases=[
  ['photo-first','![Photo](first.png)\n\n```mermaid\ngraph TD;A-->B;\n```',false],
  ['diagram-first','```mermaid\ngraph TD;A-->B;\n```\n\n![Photo](first.png)',true],
  ['html-first','<img src="first.png">\n\n```mermaid\ngraph TD;A-->B;\n```',false],
  ['no-picture','```html\n<img src="first.png">\n```\n\nText.',null]
 ];
 for(const [name,body] of cases){const file=post(root,name,{hero_image:'other.png'},body);fs.writeFileSync(path.join(path.dirname(file),'first.png'),'first');fs.writeFileSync(path.join(path.dirname(file),'other.png'),'other');}
 const result=loadContent(root,path.join(root,'none'));
 for(const [name,,diagram] of cases){const current=result.posts.find(p=>p.title===name);if(diagram===true){assert.equal(current.thumbnail,'');assert.match(current.thumbnailDiagram,/A-->B/);}else if(diagram===false){assert.match(current.thumbnail,/\/first\.png$/);assert.equal(current.thumbnailDiagram,'');}else{assert.equal(current.thumbnail,'');assert.equal(current.thumbnailDiagram,'');}}
});
test('explicit card selection supports image links and stable Mermaid block references',t=>{
 const root=fixture(t),body='```mermaid\ngraph TD;FIRST-->X;\n```\n\n> ```mermaid\n> graph LR;CHOSEN-->Y;\n> ```\n> ^chosen-diagram\n\n![Photo](first.png)';
 const file=post(root,'selected',{thumbnail:'![[selected/second.png]]'},body);fs.writeFileSync(path.join(path.dirname(file),'first.png'),'first');fs.writeFileSync(path.join(path.dirname(file),'second.png'),'second');
 let current=loadContent(root,path.join(root,'none')).posts[0];assert.equal(current.thumbnail,'/assets/selected/second.png');assert.equal(current.thumbnailDiagram,'');
 post(root,'selected',{thumbnail:'[[#^chosen-diagram]]'},body);current=loadContent(root,path.join(root,'none')).posts[0];assert.match(current.thumbnailDiagram,/CHOSEN-->Y/);assert.doesNotMatch(current.thumbnailDiagram,/FIRST/);assert.equal(current.thumbnail,'');
 post(root,'selected',{thumbnail:'[[#^chosen-diagram]]'},'```mermaid\ngraph TD;NEW-->Z;\n```\n\n'+body);current=loadContent(root,path.join(root,'none')).posts[0];assert.match(current.thumbnailDiagram,/CHOSEN-->Y/);
});
test('invalid explicit card selections fail rather than silently selecting another picture',t=>{
 const root=fixture(t);
 for(const thumbnail of ['missing.png','[[#^missing-diagram]]','note.md']){post(root,'bad',{thumbnail},'```mermaid\ngraph TD;A-->B;\n```');assert.throws(()=>loadContent(root,path.join(root,'none')),/thumbnail/);}
});

test('YouTube embeds participate in card source order and explicit photos still win',t=>{
 const root=fixture(t),video='<iframe src="https://www.youtube.com/embed/yonRGtMDDH8?rel=0" title="video"></iframe>',photo='![Photo](photo.png)',diagram='```mermaid\ngraph TD;A-->B;\n```';
 for(const [name,body,selected] of [['video',video+'\n\n'+photo],['photo',photo+'\n\n'+video],['diagram',diagram+'\n\n'+video],['chosen',video+'\n\n'+photo,'./photo.png']]){
  const source=post(root,name,selected?{thumbnail:selected}:{},body);fs.writeFileSync(path.join(path.dirname(source),'photo.png'),'photo');
 }
 const posts=loadContent(root,path.join(root,'none')).posts,find=name=>posts.find(p=>p.title===name);
 assert.equal(find('video').thumbnail,'https://i.ytimg.com/vi/yonRGtMDDH8/hqdefault.jpg');
 assert.equal(find('photo').thumbnail,'/assets/photo/photo.png');
 assert.match(find('diagram').thumbnailDiagram,/A-->B/);assert.equal(find('diagram').thumbnail,'');
 assert.equal(find('chosen').thumbnail,'/assets/chosen/photo.png');
});

test('X post images participate in card source order and explicit choices take priority',t=>{
 const root=fixture(t),id='1717179344110358638',image='https://pbs.twimg.com/media/F9SlgpVWkAAXsNw.jpg',video='<iframe src="https://embed.notion.co/api/iframe?url=https%3A%2F%2Fx.com%2Fband%2Fstatus%2F'+id+'&amp;key=test"></iframe>',photo='![Photo](photo.png)';
 for(const [name,body,selected] of [['x-first',video+'\n\n'+photo],['photo-first',photo+'\n\n'+video],['chosen-x',video+'\n\n'+photo,'./photo.png']]){const source=post(root,name,selected?{thumbnail:selected}:{},body);fs.writeFileSync(path.join(path.dirname(source),'photo.png'),'photo');}
 let result=loadContent(root,path.join(root,'none'),{[id]:image}),find=name=>result.posts.find(p=>p.title===name);
 assert.equal(find('x-first').thumbnail,image);assert.equal(find('photo-first').thumbnail,'/assets/photo-first/photo.png');assert.equal(find('chosen-x').thumbnail,'/assets/chosen-x/photo.png');assert.deepEqual(result.xPosts,[id]);
 result=loadContent(root,path.join(root,'none'),{});assert.equal(find('x-first').thumbnail,'/assets/x-first/photo.png');
});

test('comment post IDs remain fixed across permalink changes and reject collisions',t=>{
 const root=fixture(t);post(root,'first',{post_id:'stable-post-123',permalink:'/old'});
 assert.equal(loadContent(root,path.join(root,'none')).posts[0].id,'stable-post-123');
 post(root,'first',{post_id:'stable-post-123',permalink:'/new'});assert.equal(loadContent(root,path.join(root,'none')).posts[0].id,'stable-post-123');
 post(root,'second',{post_id:'stable-post-123'});assert.throws(()=>loadContent(root,path.join(root,'none')),/Duplicate post_id/);
});

test('post URLs omit trailing slashes across authored paths and internal link forms without changing IDs',t=>{
 const root=fixture(t);
 post(root,'first',{permalink:'/first/',post_id:'stable-first-123'},'[Old](https://www.anyflow.net/other/#introduction)\n\n[Local](/other/)\n\n[MD](../other/other.md)\n\n<a href="https://blog.anyflow.net/other/?a=1&amp;b=2#introduction">HTML</a>');
 post(root,'other',{permalink:'/other/',post_id:'stable-other-123'});
 const content=loadContent(root,path.join(root,'none')),first=content.posts.find(p=>p.id==='stable-first-123');
 assert.equal(first.url,'/first');assert.ok(first.aliases.includes('/first/'));
 assert.match(first.html,/href="\/other#introduction"/);
 assert.match(first.html,/href="\/other"/);
 assert.match(first.html,/href="\/other\?a=1&amp;b=2#introduction"/);
 require('../lib/validate-content').validateContent(content);
 post(root,'first',{permalink:'/first',post_id:'stable-first-123'});
 assert.equal(loadContent(root,path.join(root,'none')).posts.find(p=>p.id==='stable-first-123').url,'/first');
});
