(()=>{
 const dialog=document.querySelector(".search-dialog"),input=dialog.querySelector(".search-input"),filter=dialog.querySelector(".search-filter"),status=dialog.querySelector(".search-status"),list=dialog.querySelector(".search-results"),more=dialog.querySelector(".search-more");
 let enginePromise,tag=null,results=[],shown=0,request=0,timer,lastFocus;
 function engine(){return enginePromise||(enginePromise=import("/pagefind/pagefind.js").catch(error=>{enginePromise=null;throw error;}));}
 function failed(){status.textContent="검색을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.";more.hidden=true;}
 async function append(version){
  const focusMore=document.activeElement===more,start=shown;
  more.disabled=true;
  try {
   const items=await Promise.all(results.slice(shown,shown+10).map(result=>result.data()));
   if(version!==request||!dialog.open)return;
   const fragment=document.createDocumentFragment();
   for(const item of items){
    const li=document.createElement("li"),link=document.createElement("a"),title=document.createElement("h3"),excerpt=document.createElement("p");
    const preview=Array.from(item.plain_excerpt||"");
    link.href=item.url;title.textContent=item.meta.title;excerpt.textContent=preview.slice(0,240).join("")+(preview.length>240?"…":"");
    link.append(title,excerpt);li.append(link);fragment.append(li);
   }
   list.append(fragment);shown+=items.length;more.hidden=shown>=results.length;
   if(focusMore)list.children[start]?.querySelector("a").focus();
  } finally {if(version===request)more.disabled=false;}
 }
 async function search(){
  const version=++request,query=input.value.trim();
  results=[];shown=0;list.replaceChildren();more.hidden=true;filter.hidden=tag===null;filter.textContent=tag===null?"":"태그: "+tag.replace(/-/g," ")+" ×";
  list.setAttribute("aria-busy","false");
  if(!query&&tag===null){status.textContent="검색어를 입력하세요.";return;}
  status.textContent="검색 중…";list.setAttribute("aria-busy","true");
  try {
   const pagefind=await engine(),found=await pagefind.search(query||null,{filters:tag===null?{}:{tag:tag.toLowerCase().replace(/[-\s]+/g," ").trim()}});
   if(version!==request||!dialog.open)return;
   const label=query?'“'+query+'” 검색 결과':"검색 결과";
   results=found.results;status.textContent=results.length?label+" "+results.length+"개":label+"가 없습니다.";
   await append(version);
  } catch {if(version===request&&dialog.open)failed();}
  finally {if(version===request)list.setAttribute("aria-busy","false");}
 }
 function open(selectedTag=null){
  tag=selectedTag;input.value="";lastFocus=document.activeElement;
  if(!dialog.open)dialog.showModal();input.focus();search();
 }
 document.querySelector(".search-button").addEventListener("click",()=>open());
 document.addEventListener("click",event=>{const button=event.target.closest("[data-search-tag]");if(button){event.preventDefault();open(button.dataset.searchTag);}});
 input.addEventListener("input",event=>{++request;clearTimeout(timer);if(!event.isComposing)timer=setTimeout(search,180);});
 input.addEventListener("compositionstart",()=>{++request;clearTimeout(timer);});
 input.addEventListener("compositionend",()=>{clearTimeout(timer);timer=setTimeout(search,180);});
 input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.isComposing){clearTimeout(timer);search();}});
 filter.addEventListener("click",()=>{tag=null;input.focus();search();});
 more.addEventListener("click",async()=>{const version=request;try{await append(version);}catch{if(version===request&&dialog.open)failed();}});
 dialog.querySelector(".search-close").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("keydown",event=>{
  if(event.key!=="Tab")return;
  const items=Array.from(dialog.querySelectorAll('button:not([disabled]),input,a[href]')).filter(e=>e.getClientRects().length),first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 dialog.addEventListener("click",event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
 dialog.addEventListener("close",()=>{++request;clearTimeout(timer);if(lastFocus?.isConnected)lastFocus.focus();});
})();
