(()=>{
 const images=Array.from(document.querySelectorAll('.post-body img,.post-body .mermaid')).filter(image=>!image.closest('a,.page-mention-icon,.callout-icon'));
 if(!images.length)return;
 const dialog=document.createElement('dialog'),preview=document.createElement('img'),close=document.createElement('button');
 dialog.className='image-viewer';dialog.setAttribute('aria-label','이미지 확대');
 close.type='button';close.className='image-viewer-close';close.textContent='✕';close.setAttribute('aria-label','이미지 닫기');
 dialog.append(close,preview);document.body.append(dialog);
 let trigger,diagram;
 function open(image){
  if(image.matches('.mermaid')){
   const node=image.querySelector('svg');if(!node)return;
   diagram={node,parent:image,minHeight:image.style.minHeight};
   image.style.minHeight=image.getBoundingClientRect().height+'px';
   preview.hidden=true;dialog.append(node);
  }else{preview.hidden=false;preview.src=image.currentSrc||image.src;preview.alt=image.alt;}
  trigger=image;dialog.showModal();
 }
 for(const image of images){
  image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-haspopup','dialog');image.setAttribute('aria-label',image.matches('.mermaid')?'다이어그램 확대':(image.alt||'이미지')+' 확대');
  image.addEventListener('click',()=>open(image));
  image.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(image);}});
 }
 dialog.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  if(diagram){diagram.parent.append(diagram.node);diagram.parent.style.minHeight=diagram.minHeight;diagram=null;}
  preview.removeAttribute('src');preview.hidden=false;trigger?.focus();
 });
})();
