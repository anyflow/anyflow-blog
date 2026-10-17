const {Plugin,Menu,Modal,Setting,Notice,parseYaml,requestUrl,setIcon,moment,stringifyYaml,loadMermaid,MarkdownRenderer}=require('obsidian');
const bookmark=require('./bookmark');
const {createRenderer,installMermaid}=require('./mermaid-profile');
const {VisualGallery}=require('./visual-gallery');
const {mention,metadata,webUrl}=require('./link-preview');
function cardlinkSource(source){
 const lines=source.split('\n');let prefix;
 for(const line of lines){if(!line.trim())continue;const indent=/^[\t ]*/.exec(line)[0];if(prefix===undefined)prefix=indent;while(!indent.startsWith(prefix))prefix=prefix.slice(0,-1);}
 return prefix?lines.map(line=>line.startsWith(prefix)?line.slice(prefix.length):line).join('\n'):source;
}
function listIndent(items,line,offset){
 let owner=items.filter(item=>item.position.start.line<=line&&item.position.end.line>=line).sort((a,b)=>b.position.start.line-a.position.start.line)[0],depth=0;const seen=new Set();
 while(owner&&!seen.has(owner)){if(owner.task!==undefined)return '';seen.add(owner);depth++;owner=owner.parent>=0?items.find(item=>item.position.start.line===owner.parent):null;}
 return depth&&!owner?'calc('+depth*32+'px - '+offset+'px)':'';
}
function pasteCandidate(event,editor,view){
 const url=event.clipboardData?.getData('text/plain')?.trim();if(event.defaultPrevented||!webUrl(url)||/\s/.test(url)||editor.somethingSelected())return '';
 const position=editor.getCursor(),cache=view.app.metadataCache.getFileCache(view.file);
 if(cache?.sections?.some(s=>s.type==='code'&&position.line>=s.position.start.line&&position.line<=s.position.end.line))return '';
 const prefix=editor.getValue().split('\n').slice(0,position.line+1).join('\n');
 if((prefix.match(/^\s*(?:`{3,}|~{3,})/gm)||[]).length%2)return '';
 const line=(editor.getLine?.(position.line)||prefix.split('\n').at(-1)).slice(0,position.ch).replace(/\\./g,'');let ticks=0;for(const match of line.matchAll(/`+/g)){if(!ticks)ticks=match[0].length;else if(ticks===match[0].length)ticks=0;}if(ticks)return '';
 return webUrl(url);
}
function newPostPath(value){
 const path=String(value||'').trim().replace(/\.md$/i,'')+'.md';
 if(path.length>2048||path.toLowerCase()==='blog.md'||/[\\\s%?#<>:"|*\u0000-\u001f]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('_')||p.startsWith('.')))throw new Error('파일 경로를 확인하세요. 공백·특수문자·숨김 폴더 없이 폴더/파일명을 입력하세요.');
 return path;
}
class NewPostModal extends Modal{
 constructor(app,plugin){super(app);this.plugin=plugin;const folder=app.workspace.getActiveFile()?.parent?.path;this.path=folder&&folder!=='/'&&!folder.split('/').some(p=>p.startsWith('_')||p.startsWith('.'))?folder+'/':'';}
 onOpen(){
  this.titleEl.setText('새 블로그 글 만들기');
  new Setting(this.contentEl).setName('파일 경로').setDesc('Vault 기준 경로입니다. 제목은 파일명, 작성일은 오늘 날짜로 입력하며 미발행 상태로 만듭니다.').addText(text=>{
   text.setPlaceholder('sw-engineer/new-post').setValue(this.path).onChange(value=>{this.path=value;});
   text.inputEl.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.submit();}});text.inputEl.focus();
  });
  this.error=this.contentEl.createDiv();this.error.style.color='var(--text-error)';this.error.setAttribute('role','alert');
  new Setting(this.contentEl).addButton(button=>{this.button=button;button.setButtonText('생성').setCta().onClick(()=>this.submit());});
 }
 async submit(){
  if(this.busy)return;this.busy=true;this.button.setDisabled(true);this.error.setText('');
  try{await this.plugin.createPost(this.path);this.close();}
  catch(error){this.error.setText(error.message);}
  finally{this.busy=false;this.button.setDisabled(false);}
 }
 onClose(){this.contentEl.empty();}
}
module.exports=class BlogLinks extends Plugin{
 async onload(){
  const nativeMermaid=typeof loadMermaid==='function'?await loadMermaid():typeof window!=='undefined'?window.mermaid:null;
  if(nativeMermaid){
   let renderer;try{renderer=createRenderer(require('./vendor/mermaid-12.1.0.min.js'));const restore=installMermaid(nativeMermaid,renderer.engine);this.register(()=>{restore();renderer.dispose();});}
   catch{renderer?.dispose();new Notice('GitHub Mermaid 렌더러를 시작하지 못했습니다. 기본 렌더러를 유지합니다.');}
  }
  this.addCommand({id:'create-post',name:'새 글 만들기',callback:()=>new NewPostModal(this.app,this).open()});
  this.addCommand({id:'select-category',name:'분류 선택',checkCallback:checking=>{
   const file=this.app.workspace.getActiveFile();if(!file||file.extension!=='md'||file.path==='blog.md'||file.path.split('/').some(p=>p.startsWith('_')))return false;
   if(!checking)this.categoryMenu(file,{x:window.innerWidth/2,y:window.innerHeight/3});return true;
  }});
  const container=this.app.workspace.containerEl,observer=new MutationObserver(records=>{if(records.every(r=>r.type==='attributes'&&!r.target.matches('.cm-line.HyperMD-list-line,.cm-line.HyperMD-quote,.markdown-source-view,.cm-lineNumbers .cm-gutterElement')))return;this.mountCategoryButtons();this.mountListIndents();this.mountCardIndents();this.mountCaptionLines();this.mountLineNumbers();});
  observer.observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','data-blog-list-indent']});
  this.register(()=>{observer.disconnect();container.querySelectorAll('.blog-category-picker').forEach(el=>el.remove());});
  this.mountCategoryButtons();this.mountListIndents();this.mountCardIndents();this.mountCaptionLines();this.mountLineNumbers();
  const openVisual=event=>{
   const target=event.target.closest?.('.metadata-property-value');if(!target)return;
   const row=target.closest('.metadata-property'),key=row?.dataset.propertyKey;if(!['cover','icon'].includes(key))return;
   if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
   const file=this.app.workspace.getLeavesOfType('markdown').find(leaf=>leaf.view.containerEl.contains(row))?.view.file;if(!file)return;
   event.preventDefault();event.stopImmediatePropagation();
   // Keep the native property editor from restoring and later saving its stale value.
   if(event.type==='pointerdown'||event.type==='mousedown')return;
   if(this.visualModal)return;target.querySelector?.('[contenteditable=true],input')?.blur();this.visualModal=new VisualGallery(this,file,key);this.visualModal.open();
  };
  this.registerDomEvent(container,'pointerdown',openVisual,true);this.registerDomEvent(container,'mousedown',openVisual,true);this.registerDomEvent(container,'click',openVisual,true);this.registerDomEvent(container,'keydown',openVisual,true);
  this.register(()=>{this.visualModal?.close();});
  const initialAttachments=this.app.vault.config.attachmentFolderPath;this.register(()=>{this.app.vault.config.attachmentFolderPath=initialAttachments;});
  const attachments=file=>{if(file?.extension==='md'&&!file.path.split('/').some(p=>p.startsWith('_'))&&this.app.workspace.getActiveFile()?.path===file.path)this.app.vault.config.attachmentFolderPath='_assets/'+file.path.replace(/\.md$/,'');};
  this.registerEvent(this.app.workspace.on('file-open',attachments));
  this.registerEvent(this.app.metadataCache.on('changed',file=>{attachments(file);this.mountListIndents();this.mountCardIndents();this.mountCaptionLines();this.mountLineNumbers();}));
  attachments(this.app.workspace.getActiveFile());
  this.cache={};const file=this.app.vault.getAbstractFileByPath('_assets/_meta/link-previews.json');
  if(file){try{this.cache=JSON.parse(await this.app.vault.read(file));}catch{new Notice('링크 정보 파일을 읽지 못했습니다. 원본 파일은 유지합니다.');}}
  this.bookmarks={};const bookmarksFile=this.app.vault.getAbstractFileByPath('_assets/_meta/bookmarks.json');
  if(bookmarksFile){try{this.bookmarks=JSON.parse(await this.app.vault.read(bookmarksFile)).posts;}catch{new Notice('기존 북마크 정보를 읽지 못했습니다.');}}
  this.registerMarkdownCodeBlockProcessor('cardlink',async(source,el,ctx)=>{
   try{const data=parseYaml(cardlinkSource(source));if(!data||typeof data.url!=='string')throw new Error('URL이 필요합니다.');const saved=this.cache[data.url]||{};el.addClass('blog-links');el.innerHTML=bookmark({...saved,...data,title:data.title||saved.title,description:data.description||saved.description,cover:data.image||saved.cover,icon:data.favicon||saved.icon},{resolveImage:raw=>{const path=String(raw).replace(/^!?\[\[|\]\]$/g,'').split('|')[0];const file=this.app.metadataCache.getFirstLinkpathDest(path,ctx.sourcePath);return file?this.app.vault.getResourcePath(file):'';}});}
   catch(error){el.setText(source);new Notice(error.message);}
  });
  this.registerMarkdownPostProcessor(async(el,ctx)=>{
   await this.renderIndentedCaptions(el,ctx.sourcePath);
   const id=ctx.sourcePath==='blog.md'?'/':'/'+ctx.sourcePath.replace(/\.md$/,'');
   for(const paragraph of el.querySelectorAll('p')){
    const anchor=paragraph.querySelector(':scope>a');if(!anchor||anchor.title==='mention'||paragraph.children.length!==1||paragraph.textContent.trim()!==anchor.textContent.trim())continue;
    const url=anchor.getAttribute('href'),saved=(this.bookmarks[id]||[]).find(b=>b.url===url);
    if(!saved&&!/^https:\/\/(?:youtu\.be|(?:www\.)?youtube\.com)\//.test(url||''))continue;
    try{const box=document.createElement('div');box.className='blog-links';box.innerHTML=bookmark({...saved,url,title:anchor.textContent});paragraph.replaceWith(box);}catch{/* Preserve the original link. */}
   }
   for(const anchor of el.querySelectorAll('a[title="mention"]')){
    try{const box=document.createElement('span');box.className='blog-links';box.innerHTML=mention(anchor.getAttribute('href'),this.cache[anchor.getAttribute('href')],anchor.textContent);anchor.replaceWith(box);}catch{/* Keep the original link on invalid metadata. */}
   }
  });
  for(const leaf of this.app.workspace.getLeavesOfType('markdown'))if(leaf.view.file)await this.renderIndentedCaptions(leaf.view.containerEl,leaf.view.file.path);
  this.registerEvent(this.app.workspace.on('editor-paste',(event,editor,view)=>{
   const url=pasteCandidate(event,editor,view);if(!url)return;
   event.preventDefault();const start=editor.getCursor();editor.replaceSelection(url);
   const end={line:start.line,ch:start.ch+url.length},file=view.file;
   const menu=new Menu();for(const [type,label]of [['url','일반 링크'],['mention','링크 멘션'],['preview','작은 미리보기'],['bookmark','북마크 카드']])menu.addItem(item=>item.setTitle(label).onClick(()=>this.choose(type,url,editor,start,end,file)));
   const coords=editor.cm?.coordsAtPos(editor.posToOffset(start));menu.showAtPosition({x:coords?.left||event.clientX||100,y:coords?.bottom||event.clientY||100});
  }));
 }
 async renderIndentedCaptions(el,sourcePath){
   for(const quote of [...(el.matches('blockquote')?[el]:[]),...el.querySelectorAll('blockquote')]){
    const code=quote.querySelector(':scope>pre:only-child>code');if(!code||code.className.includes('language-')||!/^[ \t]*\[!caption\](?:[ \t]*\n|$)/i.test(code.textContent))continue;
    const indent=/^[ \t]*/.exec(code.textContent)[0],source=code.textContent.split('\n').map(line=>line.startsWith(indent)?line.slice(indent.length):line).join('\n');
    const rendered=document.createElement('div');
    await MarkdownRenderer.render(this.app,source.trimEnd().split('\n').map(line=>'> '+line).join('\n'),rendered,sourcePath,this);
    quote.replaceWith(...rendered.childNodes);
   }
 }
 async createPost(value){
  const path=newPostPath(value);if(this.app.vault.getAbstractFileByPath(path))throw new Error('같은 경로의 파일이 이미 있습니다: '+path);
  const date=moment().format('YYYY-MM-DD'),title=path.split('/').at(-1).slice(0,-3);
  const content='---\n'+stringifyYaml({title,summary:'',created:date,updated:date,category:'',tags:[],publish:false,noindex:false,cover:'',icon:''}).trimEnd()+'\n---\n\n';
  const folders=path.split('/').slice(0,-1);let parent='';
  for(const part of folders){parent+=(parent?'/':'')+part;const folder=this.app.vault.getAbstractFileByPath(parent);if(folder&&!Array.isArray(folder.children))throw new Error('폴더 경로에 파일이 있습니다: '+parent);if(!folder)await this.app.vault.createFolder(parent);}
  const file=await this.app.vault.create(path,content);await this.app.workspace.getLeaf(false).openFile(file);return file;
 }
 mountCaptionLines(){
  for(const leaf of this.app.workspace.getLeavesOfType('markdown')){
   const view=leaf.view,cm=view.editor?.cm;if(!cm)continue;let changed=false;
   for(const row of view.containerEl.querySelectorAll('.cm-line')){
    const isCaption=row.classList.contains('HyperMD-quote')&&!row.classList.contains('HyperMD-codeblock')&&captionLine(cm.state.doc,cm.state.doc.lineAt(cm.posAtDOM(row)).number);
    if(!isCaption){if(row.hasAttribute('data-blog-caption')){delete row.dataset.blogCaption;delete row.dataset.blogCaptionPrefix;changed=true;}continue;}
    if(!row.hasAttribute('data-blog-caption')){row.dataset.blogCaption='true';changed=true;}
    const prefix=(row.querySelector('.cm-formatting-quote')?.getBoundingClientRect().width||0)+'px';
    if(row.dataset.blogCaptionPrefix!==prefix){row.dataset.blogCaptionPrefix=prefix;changed=true;}
   }
   if(changed)cm.requestMeasure();
  }
 }
 mountLineNumbers(){
  for(const leaf of this.app.workspace.getLeavesOfType('markdown')){
   const view=leaf.view,cm=view.editor?.cm;if(!cm)continue;
   const labels=new Map([...view.containerEl.querySelectorAll('.cm-lineNumbers .cm-gutterElement')].map(el=>[Number(el.textContent.trim()),el]));if(!labels.size)continue;
   for(const row of view.containerEl.querySelectorAll('.is-live-preview .cm-content>.cm-line')){
    if(!row.getClientRects().length||cm.dom&&row.closest('.cm-editor')!==cm.dom)continue;
    const label=labels.get(cm.state.doc.lineAt(cm.posAtDOM(row)).number);if(!label)continue;
    const style=getComputedStyle(row),line=parseFloat(style.lineHeight)||24,height=line>0?Math.min(24,line):24;
    label.dataset.blogNumberOffset=Math.max(0,(parseFloat(style.paddingTop)||0)+(line-height)/2)+'px';label.dataset.blogNumberLineHeight=height+'px';
   }
  }
 }
 mountListIndents(){
  for(const leaf of this.app.workspace.getLeavesOfType('markdown')){
   const view=leaf.view,cm=view.editor?.cm;if(!cm||!view.file)continue;
   const items=this.app.metadataCache.getFileCache(view.file)?.listItems;if(!items)continue;let changed=false;
   const ends=new Map(items.map(item=>[item.position.start.line,item.position.end.line]));
   for(const item of [...items].sort((a,b)=>b.position.start.line-a.position.start.line))if(ends.has(item.parent))ends.set(item.parent,Math.max(ends.get(item.parent),ends.get(item.position.start.line)));
   for(const row of view.containerEl.querySelectorAll('.is-live-preview .cm-content>.HyperMD-list-line:not(.HyperMD-codeblock)')){
    const text=row.querySelector('[class*="cm-list-"]:not(.cm-formatting)');if(!text)continue;
    const line=cm.state.doc.lineAt(cm.posAtDOM(row)).number-1,offset=text.getBoundingClientRect().left-row.getBoundingClientRect().left;
    const margin=listIndent(items,line,offset);
    const close=margin?[...ends.values()].filter(end=>end===line).length:0;
    const item=items.find(item=>item.position.start.line===line),firstNested=Boolean(margin&&item?.parent>=0&&items.find(sibling=>sibling.parent===item.parent)===item);
    if(String(close||'')!==(row.dataset.blogListClose||'')||Boolean(row.dataset.blogListNestedFirst)!==firstNested)changed=true;
    if(close)row.dataset.blogListClose=String(close);else delete row.dataset.blogListClose;
    if(firstNested)row.dataset.blogListNestedFirst='true';else delete row.dataset.blogListNestedFirst;
    if(row.dataset.blogListIndent===margin)continue;
    if(margin){row.dataset.blogListIndent=margin;row.dataset.blogListDepth=/HyperMD-list-line-(\d+)/.exec(row.className)?.[1]||'1';}else{delete row.dataset.blogListIndent;delete row.dataset.blogListDepth;}changed=true;
   }
   if(changed)cm.requestMeasure();
  }
 }
 mountCardIndents(){
  for(const el of this.app.workspace.containerEl.querySelectorAll('.cm-lang-cardlink .block-language-cardlink')){
   const widget=el.closest('.cm-lang-cardlink');let line=widget?.previousElementSibling;
   const nested=line?.classList.contains('HyperMD-list-line');
   if(nested){do{line=line.previousElementSibling;}while(line&&(!line.classList.contains('cm-line')||line.classList.contains('HyperMD-codeblock')||!line.textContent.trim()));}
   const text=nested&&line?.classList.contains('HyperMD-list-line')?line.querySelector('[class*="cm-list-"]:not(.cm-formatting)'):null;
   el.classList.toggle('blog-list-card',Boolean(text));
   const margin=text?Math.max(0,text.getBoundingClientRect().left-widget.getBoundingClientRect().left)+'px':'';
   if(el.style.marginInlineStart===margin)continue;
   el.style.marginInlineStart=margin;
   this.app.workspace.getLeavesOfType('markdown').find(leaf=>leaf.view.containerEl.contains(el))?.view.editor?.cm?.requestMeasure();
  }
 }
 mountCategoryButtons(){
  for(const button of this.app.workspace.containerEl.querySelectorAll('.blog-category-picker'))if(button.closest('.metadata-property')?.dataset.propertyKey!=='category')button.remove();
  for(const row of this.app.workspace.containerEl.querySelectorAll('.metadata-property[data-property-key="category"]')){
   if(row.querySelector('.blog-category-picker'))continue;
   const file=this.app.workspace.getLeavesOfType('markdown').find(leaf=>leaf.view.containerEl.contains(row))?.view.file;
   if(!file||file.path==='blog.md'||file.path.split('/').some(p=>p.startsWith('_')))continue;
   const button=row.createEl('button',{cls:'clickable-icon blog-category-picker',attr:{type:'button','aria-label':'분류 선택',title:'분류 선택'}});setIcon(button,'chevrons-up-down');
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const rect=button.getBoundingClientRect();const target=this.app.workspace.getLeavesOfType('markdown').find(leaf=>leaf.view.containerEl.contains(row))?.view.file;if(target&&target.path!=='blog.md'&&!target.path.split('/').some(p=>p.startsWith('_')))this.categoryMenu(target,{x:rect.left,y:rect.bottom});});
  }
 }
 categoryMenu(file,position){
  const values=new Set();
  for(const note of this.app.vault.getMarkdownFiles()){
   if(note.path==='blog.md'||note.path.split('/').some(p=>p.startsWith('_')))continue;
   const value=this.app.metadataCache.getFileCache(note)?.frontmatter?.category;if(typeof value==='string'&&value.trim())values.add(value.trim());
  }
  if(!values.size){new Notice('분류가 지정된 글이 없습니다.');return;}
  const current=this.app.metadataCache.getFileCache(file)?.frontmatter?.category,menu=new Menu();
  for(const value of [...values].sort((a,b)=>a.localeCompare(b,'ko')))menu.addItem(item=>item.setTitle(value).setChecked(value===current).onClick(async()=>{
   try{if(this.app.vault.getAbstractFileByPath(file.path)!==file)throw new Error('글 파일을 찾을 수 없습니다.');await this.app.fileManager.processFrontMatter(file,front=>{front.category=value;});}
   catch(error){new Notice('분류 저장 실패: '+error.message);}
  }));
  menu.showAtPosition(position);
 }
 async choose(type,url,editor,start,end,file){
  if(type==='url')return;
  let data=this.cache[url]||{};
  try{
   if(!data.checkedAt||Date.now()-data.checkedAt>86400000){data={...data,...await metadata(url,async target=>{const r=await Promise.race([requestUrl({url:target,throw:false}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('조회 시간 초과')),6000))]);if(r.status!==200)throw new Error('HTTP '+r.status);if(r.text.length>1024*1024)throw new Error('응답이 너무 큽니다.');return r.text;}),checkedAt:Date.now()};await this.saveMetadata(url,data);}
  }catch{new Notice('링크 정보를 가져오지 못했습니다. URL을 보존하고 게시 빌드에서 재시도합니다.');}
  // A metadata request must never overwrite text edited while it was running.
  if(this.app.workspace.getActiveFile()?.path!==file.path||editor.getRange(start,end)!==url){new Notice('본문이 변경되어 링크 변환을 중단했습니다.');return;}
  const title=(data.title||url).replace(/([\\[\]])/g,'\\$1');
  const text=type==='mention'?'['+title+'](<'+url+'> "mention")':'```cardlink\nurl: '+JSON.stringify(url)+'\n'+(type==='preview'?'type: preview\n':'')+'```';
  const line=editor.getLine(start.line),block=type!=='mention';
  const before=block&&line.slice(0,start.ch).trim()?'\n\n':'',after=block&&line.slice(end.ch).trim()?'\n\n':'';
  editor.replaceRange(before+text+after,start,end);
 }
 async saveMetadata(url,data){
  const path='_assets/_meta/link-previews.json',file=this.app.vault.getAbstractFileByPath(path);
  if(file)await this.app.vault.process(file,raw=>{const current=JSON.parse(raw);current[url]=data;this.cache=current;return JSON.stringify(current,null,2)+'\n';});
  else{for(const folder of ['_assets','_assets/_meta'])if(!this.app.vault.getAbstractFileByPath(folder))await this.app.vault.createFolder(folder);this.cache[url]=data;await this.app.vault.create(path,JSON.stringify(this.cache,null,2)+'\n');}
 }
};
module.exports.pasteCandidate=pasteCandidate;

module.exports.newPostPath=newPostPath;

module.exports.cardlinkSource=cardlinkSource;

module.exports.listIndent=listIndent;

function captionLine(doc,number){
 let depth=Infinity;
 for(let n=number;n>0;n--){
  const text=doc.line(n).text,prefix=/^[ \t]*(?:>[ \t]*)+/.exec(text)?.[0];if(!prefix)return false;
  const current=prefix.split('>').length-1;if(current>depth)continue;depth=current;
  const marker=/^\[!([\w-]+)\]/.exec(text.slice(prefix.length));if(marker)return marker[1].toLowerCase()==='caption';
 }
 return false;
}
module.exports.captionLine=captionLine;
