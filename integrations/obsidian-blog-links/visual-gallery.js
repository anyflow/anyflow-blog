const {Modal,Setting,Notice}=require('obsidian');
const imagePath=value=>/\.(?:png|jpe?g|webp|gif|svg|avif|ico)(?:[?#]|$)/i.test(value);
const isEmoji=value=>/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(value)&&/^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\u200d|\ufe0f|[0-9#*]\ufe0f?\u20e3)+$/u.test(value);
const cleanValue=value=>String(value||'').trim().replace(/^!?\[\[|\]\]$/g,'').split('|')[0];
const pageFor=(items,value,size=60)=>Math.floor(Math.max(0,items.findIndex(item=>item.value===value))/size);
function choices(app,key){
 const images=app.vault.getFiles().filter(file=>imagePath(file.path)&&file.path.startsWith(key==='cover'?'_assets/_covers/':'_assets/_icons/')).sort((a,b)=>a.path.localeCompare(b.path)).map(file=>({value:file.path,label:file.path,image:app.vault.getResourcePath(file)}));
 const emojis=key==='icon'?[...new Set(app.vault.getMarkdownFiles().map(file=>app.metadataCache.getFileCache(file)?.frontmatter?.icon).filter(value=>typeof value==='string'&&isEmoji(value)&&!imagePath(value)))].map(value=>({value,label:value})):[];
 return [...emojis,...images];
}
async function save(app,file,key,value,original){
 if(app.vault.getAbstractFileByPath(file.path)!==file)throw new Error('글 파일을 찾을 수 없습니다.');
 value=cleanValue(value);
 if(value&&key==='cover'&&!imagePath(value))throw new Error('커버 이미지 경로를 입력하세요.');
 if(value&&key==='icon'&&!imagePath(value)&&!isEmoji(value))throw new Error('이모지 또는 이미지 경로를 입력하세요.');
 if(imagePath(value)&&!/^https?:\/\//i.test(value)&&!app.metadataCache.getFirstLinkpathDest(value,file.path))throw new Error('이미지 파일을 찾을 수 없습니다.');
 await app.fileManager.processFrontMatter(file,front=>{
  if(cleanValue(front[key])!==cleanValue(original))throw new Error('다른 곳에서 값이 변경되었습니다. 갤러리를 다시 열어 주세요.');
  front[key]=value;
 });
}
class VisualGallery extends Modal{
 constructor(plugin,file,key){super(plugin.app);this.plugin=plugin;this.file=file;this.key=key;this.original=this.app.metadataCache.getFileCache(file)?.frontmatter?.[key]||'';this.selected=cleanValue(this.original);if(imagePath(this.selected))this.selected=this.app.metadataCache.getFirstLinkpathDest(this.selected,file.path)?.path||this.selected;this.items=choices(this.app,key);this.filtered=this.items;this.page=pageFor(this.items,this.selected);}
 onOpen(){
  this.modalEl.addClass('blog-visual-gallery');this.titleEl.setText(this.key==='cover'?'커버 선택':'아이콘 선택');
  const search=this.contentEl.createEl('input',{type:'search',placeholder:'이름·폴더 검색',attr:{'aria-label':'갤러리 검색'}});
  search.addEventListener('input',()=>{const query=search.value.toLowerCase().trim();this.filtered=this.items.filter(item=>item.label.toLowerCase().includes(query));this.page=0;this.draw();});
  new Setting(this.contentEl).setName('직접 입력').addText(text=>text.setValue(this.selected).setPlaceholder(this.key==='icon'?'이모지 또는 이미지 경로':'이미지 경로').onChange(value=>{this.manual=value;})).addButton(button=>button.setButtonText('적용').onClick(()=>this.choose(this.manual??this.selected))).addButton(button=>button.setButtonText('지우기').onClick(()=>this.choose('')));
  if(this.selected&&!this.items.some(item=>item.value===this.selected)){
   const current=this.contentEl.createDiv('blog-visual-current');current.createSpan({text:'현재 값: '+this.selected});const file=this.app.metadataCache.getFirstLinkpathDest(this.selected,this.file.path);if(file||/^https?:\/\//i.test(this.selected))current.createEl('img',{attr:{src:file?this.app.vault.getResourcePath(file):this.selected,alt:'현재 선택'}});else current.createSpan({text:this.selected});
  }
  this.grid=this.contentEl.createDiv('blog-visual-grid');this.navigation=this.contentEl.createDiv('blog-visual-navigation');this.error=this.contentEl.createDiv();this.error.setAttribute('role','alert');this.draw();
 }
 draw(){
  this.grid.empty();this.navigation.empty();const size=60,pages=Math.max(1,Math.ceil(this.filtered.length/size));this.page=Math.min(this.page,pages-1);
  for(const item of this.filtered.slice(this.page*size,(this.page+1)*size)){
   const button=this.grid.createEl('button',{cls:'blog-visual-choice',attr:{type:'button','aria-label':item.label,'aria-pressed':String(item.value===this.selected),title:item.label}});
   if(item.image)button.createEl('img',{attr:{src:item.image,alt:'',loading:'lazy'}});else button.createSpan({text:item.value,cls:'blog-visual-emoji'});
   button.createSpan({text:item.label.split('/').at(-1),cls:'blog-visual-label'});button.addEventListener('click',()=>this.choose(item.value));
  }
  for(const [label,delta]of [['이전',-1],['다음',1]]){const button=this.navigation.createEl('button',{text:label});button.disabled=this.page+delta<0||this.page+delta>=pages;button.addEventListener('click',()=>{this.page+=delta;this.draw();});if(delta===-1)this.navigation.createSpan({text:(this.page+1)+' / '+pages+' · '+this.filtered.length+'개'});}
 }
 async choose(value){
  if(this.busy)return;this.busy=true;
  try{await save(this.app,this.file,this.key,value,this.original);this.close();}
  catch(error){this.error.setText(error.message);new Notice(error.message);}
  finally{this.busy=false;}
 }
 onClose(){this.plugin.visualModal=null;this.contentEl.empty();}
}
module.exports={VisualGallery,pageFor,cleanValue,choices,save};
