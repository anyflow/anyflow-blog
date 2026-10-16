const {Plugin,Menu,Notice,parseYaml,requestUrl,setIcon}=require('obsidian');
const bookmark=require('./bookmark');
const {mention,metadata,webUrl}=require('./link-preview');
function pasteCandidate(event,editor,view){
 const url=event.clipboardData?.getData('text/plain')?.trim();if(event.defaultPrevented||!webUrl(url)||/\s/.test(url)||editor.somethingSelected())return '';
 const position=editor.getCursor(),cache=view.app.metadataCache.getFileCache(view.file);
 if(cache?.sections?.some(s=>s.type==='code'&&position.line>=s.position.start.line&&position.line<=s.position.end.line))return '';
 const prefix=editor.getValue().split('\n').slice(0,position.line+1).join('\n');
 if((prefix.match(/^\s*(?:`{3,}|~{3,})/gm)||[]).length%2)return '';
 const line=(editor.getLine?.(position.line)||prefix.split('\n').at(-1)).slice(0,position.ch).replace(/\\./g,'');let ticks=0;for(const match of line.matchAll(/`+/g)){if(!ticks)ticks=match[0].length;else if(ticks===match[0].length)ticks=0;}if(ticks)return '';
 return webUrl(url);
}
module.exports=class BlogLinks extends Plugin{
 async onload(){
  this.addCommand({id:'select-category',name:'분류 선택',checkCallback:checking=>{
   const file=this.app.workspace.getActiveFile();if(!file||file.extension!=='md'||file.path==='blog.md'||file.path.split('/').some(p=>p.startsWith('_')))return false;
   if(!checking)this.categoryMenu(file,{x:window.innerWidth/2,y:window.innerHeight/3});return true;
  }});
  const container=this.app.workspace.containerEl,observer=new MutationObserver(()=>this.mountCategoryButtons());
  observer.observe(container,{childList:true,subtree:true});
  this.register(()=>{observer.disconnect();container.querySelectorAll('.blog-category-picker').forEach(el=>el.remove());});
  this.mountCategoryButtons();
  const initialAttachments=this.app.vault.config.attachmentFolderPath;this.register(()=>{this.app.vault.config.attachmentFolderPath=initialAttachments;});
  const attachments=file=>{if(file?.extension==='md'&&!file.path.split('/').some(p=>p.startsWith('_'))&&this.app.workspace.getActiveFile()?.path===file.path)this.app.vault.config.attachmentFolderPath='_assets/'+file.path.replace(/\.md$/,'');};
  this.registerEvent(this.app.workspace.on('file-open',attachments));
  this.registerEvent(this.app.metadataCache.on('changed',attachments));
  attachments(this.app.workspace.getActiveFile());
  this.cache={};const file=this.app.vault.getAbstractFileByPath('_assets/_meta/link-previews.json');
  if(file){try{this.cache=JSON.parse(await this.app.vault.read(file));}catch{new Notice('링크 정보 파일을 읽지 못했습니다. 원본 파일은 유지합니다.');}}
  this.bookmarks={};this.pages={};
  for(const [path,key]of [['_assets/_meta/bookmarks.json','bookmarks'],['_assets/_meta/visuals.json','pages']]){
   const file=this.app.vault.getAbstractFileByPath(path);if(file){try{const data=JSON.parse(await this.app.vault.read(file));this[key]=key==='bookmarks'?data.posts:data.pages;}catch{new Notice('기존 링크 정보를 읽지 못했습니다: '+path);}}
  }
  this.registerMarkdownCodeBlockProcessor('cardlink',async(source,el,ctx)=>{
   try{const data=parseYaml(source);if(!data||typeof data.url!=='string')throw new Error('URL이 필요합니다.');const saved=this.cache[data.url]||{};el.addClass('blog-links');el.innerHTML=bookmark({...saved,...data,title:data.title||saved.title,description:data.description||saved.description,cover:data.image||saved.cover,icon:data.favicon||saved.icon},{resolveImage:raw=>{const path=String(raw).replace(/^!?\[\[|\]\]$/g,'').split('|')[0];const file=this.app.metadataCache.getFirstLinkpathDest(path,ctx.sourcePath);return file?this.app.vault.getResourcePath(file):'';}});}
   catch(error){el.setText(source);new Notice(error.message);}
  });
  this.registerMarkdownPostProcessor((el,ctx)=>{
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
  this.registerEvent(this.app.workspace.on('editor-paste',(event,editor,view)=>{
   const url=pasteCandidate(event,editor,view);if(!url)return;
   event.preventDefault();const start=editor.getCursor();editor.replaceSelection(url);
   const end={line:start.line,ch:start.ch+url.length},file=view.file;
   const menu=new Menu();for(const [type,label]of [['url','일반 링크'],['mention','링크 멘션'],['preview','작은 미리보기'],['bookmark','북마크 카드']])menu.addItem(item=>item.setTitle(label).onClick(()=>this.choose(type,url,editor,start,end,file)));
   const coords=editor.cm?.coordsAtPos(editor.posToOffset(start));menu.showAtPosition({x:coords?.left||event.clientX||100,y:coords?.bottom||event.clientY||100});
  }));
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
