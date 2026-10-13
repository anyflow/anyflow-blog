const {Plugin,Modal,Notice,Component,MarkdownRenderer,requestUrl}=require('obsidian');
const {diagrams,withBlockId,socialEmbeds}=require('./diagrams');
const {xThumbnail}=require('../../lib/x');
const isImage=file=>/\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(file.path);
class CardImagePicker extends Modal{
 constructor(plugin,file){super(plugin.app);this.plugin=plugin;this.file=file;this.component=new Component();this.choices=[];}
 async onOpen(){
  this.modalEl.addClass('blog-card-picker');this.titleEl.setText('카드 이미지 선택');this.component.load();
  try{
   this.snapshot=await this.app.vault.read(this.file);
   const cache=this.app.metadataCache.getFileCache(this.file)||{},selected=cache.frontmatter?.thumbnail||'';
   const auto=this.contentEl.createEl('button',{text:'자동 · 본문의 첫 사진·Mermaid·YouTube·X'});
   auto.classList.toggle('mod-cta',!selected);auto.addEventListener('click',()=>this.choose(null));
   this.contentEl.createEl('p',{text:'선택하지 않으면 본문의 첫 사진·Mermaid·YouTube·X 이미지를 사용합니다. 모두 없는 글은 텍스트로 표시합니다.',cls:'setting-item-description'});
   const search=this.contentEl.createEl('input',{type:'search',placeholder:'이미지 이름으로 검색',cls:'blog-card-search'});
   search.setAttribute('aria-label','카드 이미지 검색');
   const current=[];
   for(const embed of cache.embeds||[]){const file=this.app.metadataCache.getFirstLinkpathDest(embed.link,this.file.path);if(file&&isImage(file))current.push({type:'image',file,position:embed.position.start.offset});}
   for(const diagram of diagrams(this.snapshot))current.push({type:'mermaid',diagram,position:diagram.start});
   const embeds=await Promise.all(socialEmbeds(this.snapshot).map(async item=>{
    if(item.type!=='x')return item;
    try{item.url=await xThumbnail(item.id,async url=>(await requestUrl(url)).json);return item.url?item:null;}catch{return null;}
   }));
   current.push(...embeds.filter(Boolean));
   current.sort((a,b)=>a.position-b.position);
   const used=new Set(),drawSection=(title,items)=>{
    if(!items.length)return;
    this.contentEl.createEl('h3',{text:title});const grid=this.contentEl.createDiv('blog-card-grid');
    for(const item of items){
     const label=item.type==='mermaid'?'Mermaid '+(current.filter(c=>c.type==='mermaid').indexOf(item)+1):item.type==='youtube'?'YouTube '+(current.filter(c=>c.type==='youtube').indexOf(item)+1):item.type==='x'?'X '+item.id:item.file.name;
     const button=grid.createEl('button',{cls:'blog-card-choice',attr:{'aria-label':label}});
     const value=item.type==='mermaid'&&item.diagram.id?'[[#^'+item.diagram.id+']]':['youtube','x'].includes(item.type)?item.url:item.type==='image'?'[['+item.file.path+']]':'';
     button.setAttribute('aria-pressed',String(Boolean(value)&&selected===value));
     const preview=button.createDiv('blog-card-thumb');button.createSpan({text:label,cls:'blog-card-label'});
     button.addEventListener('click',event=>{event.preventDefault();this.choose(item);});
     if(item.type!=='mermaid')preview.createEl('img',{attr:{src:item.type==='image'?this.app.vault.getResourcePath(item.file):item.url,alt:'',loading:'lazy'}});
     else MarkdownRenderer.render(this.app,item.diagram.markdown,preview,this.file.path,this.component).catch(()=>preview.setText('미리보기를 표시할 수 없습니다.'));
     this.choices.push({button,label:(label+' '+(item.file?.path||item.url||'')).toLowerCase()});
    }
   };
   const unique=current.filter(item=>item.type!=='image'||(!used.has(item.file.path)&&used.add(item.file.path)));
   drawSection('이 글의 그림',unique);
   drawSection('Vault의 다른 이미지',this.app.vault.getFiles().filter(file=>isImage(file)&&!used.has(file.path)).sort((a,b)=>a.path.localeCompare(b.path)).map(file=>({type:'image',file})));
   search.addEventListener('input',()=>{const query=search.value.toLowerCase().trim();for(const choice of this.choices)choice.button.hidden=!choice.label.includes(query);});
  }catch(error){new Notice(error.message);this.close();}
 }
 async choose(item){
  if(this.busy)return;this.busy=true;
  try{await this.plugin.select(this.file,this.snapshot,item);new Notice(item?'카드 이미지를 선택했습니다.':'본문 첫 그림을 자동으로 사용합니다.');this.close();}
  catch(error){new Notice(error.message);this.busy=false;}
 }
 onClose(){this.component.unload();this.contentEl.empty();}
}
module.exports=class BlogCardImagePlugin extends Plugin{
 onload(){
  this.addCommand({id:'select-card-image',name:'카드 이미지 선택',callback:()=>this.openPicker()});
  this.addRibbonIcon('image','카드 이미지 선택',()=>this.openPicker());
  this.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>{if(file.extension==='md')menu.addItem(item=>item.setTitle('카드 이미지 선택').setIcon('image').onClick(()=>this.openPicker(file)));}));
 }
 openPicker(file=this.app.workspace.getActiveFile()){
  if(!file||file.extension!=='md'||this.app.metadataCache.getFileCache(file)?.frontmatter?.kind!=='post'){new Notice('블로그 글 노트를 먼저 열어 주세요.');return;}
  new CardImagePicker(this,file).open();
 }
 async select(file,snapshot,item){
  let value='';
  if(item?.type==='mermaid'){
   const id=item.diagram.id||'card-'+crypto.randomUUID().replaceAll('-','');
   await this.app.vault.process(file,current=>{if(current!==snapshot)throw new Error('노트가 변경되었습니다. 갤러리를 다시 열어 선택해 주세요.');return withBlockId(current,item.diagram,id);});
   value='[[#^'+id+']]';
  }else if(['youtube','x'].includes(item?.type))value=item.url;
  else if(item)value='[['+item.file.path+']]';
  await this.app.fileManager.processFrontMatter(file,frontmatter=>{if(value)frontmatter.thumbnail=value;else delete frontmatter.thumbnail;});
 }
};
