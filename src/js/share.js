(() => {
  const button=document.querySelector('.share-button'),menu=document.getElementById('share-menu');
  const links=menu.querySelectorAll('a[data-share-base]');
  const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();};
  button.addEventListener('click',async event=>{
    event.preventDefault();
    if(typeof navigator.share==='function'){
      try{await navigator.share({title:document.title,url:location.href});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    for(const link of links)link.href=link.dataset.shareBase+encodeURIComponent(location.href);
    const rect=button.getBoundingClientRect();
    menu.style.top=rect.bottom+8+'px';menu.style.right=Math.max(8,innerWidth-rect.right)+'px';
    menu.togglePopover();
  });
  menu.querySelector('.share-copy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(location.href);alert('Copied!');}
    catch{alert('Copy failed...');}
    finally{close();}
  });
  for(const link of links)link.addEventListener('click',close);
})();
