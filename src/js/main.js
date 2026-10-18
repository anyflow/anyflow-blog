const root=document.documentElement;
const theme=document.querySelector(".theme-toggle");
function updateTheme(){const dark=root.dataset.theme==="dark";theme.setAttribute("aria-checked",String(dark));theme.setAttribute("aria-label",dark?"Turn off the dark mode":"Turn on the dark mode");document.querySelector(".theme-symbol").src=dark?"/images/reference/moon.png":"/images/reference/sun.png";}
updateTheme();theme.addEventListener("click",()=>{root.dataset.theme=root.dataset.theme==="dark"?"light":"dark";try{localStorage.setItem("theme",root.dataset.theme)}catch{}updateTheme();drawGraphs();});
const toc=document.querySelector(".toc"),content=document.querySelector(".content"),progress=document.querySelector(".reading-progress");
function onScroll(){if(toc)toc.style.top=Math.max(60,content.getBoundingClientRect().top+(content.classList.contains("post-content")?12:4))+"px";const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?scrollY/max*100:0)+"%";}
addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",onScroll);onScroll();
const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){document.querySelectorAll('.toc a').forEach(a=>a.setAttribute('aria-current',String(a.getAttribute('href')==="#"+e.target.id)));}},{rootMargin:"-65px 0px -65% 0px"});
document.querySelectorAll('.content h2[id],.content h3[id],.content h4[id]').forEach(e=>observer.observe(e));
document.querySelector('.back-to-top').addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));
document.querySelectorAll('[data-load-more]').forEach(button=>button.addEventListener('click',()=>{const group=document.getElementById(button.dataset.loadMore);Array.from(group.children).filter(e=>e.hidden).slice(0,10).forEach(e=>e.hidden=false);if(!Array.from(group.children).some(e=>e.hidden))button.hidden=true;onScroll();if(group.querySelector('.mermaid'))drawGraphs();}));
function notify(text){const toast=document.querySelector('.toast');toast.textContent=text;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);}
document.querySelectorAll('.copy-code').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent);button.textContent='복사됨';setTimeout(()=>button.textContent='복사',1500);}catch{notify('코드를 선택해 복사해주세요.');}}));
if(window.hljs)hljs.highlightAll();
const graphSources=Array.from(document.querySelectorAll('.mermaid')).map(node=>({node,source:node.textContent}));
const graphScript=document.currentScript;
let graphDraw=Promise.resolve(),graphRenderer;
function drawGraphs(){if(!graphRenderer)return;graphDraw=graphDraw.then(async()=>{const graphs=graphSources.filter(({node})=>!node.closest('[hidden]'));graphRenderer.engine.initialize(blogMermaid.githubDefaults({theme:root.dataset.theme==='dark'?'dark':'default',securityLevel:'strict'}));for(const [index,{node,source}] of graphs.entries()){try{const {svg,bindFunctions}=await graphRenderer.engine.render('blog-graph-'+index,source);node.innerHTML=svg;
if(node.closest('.diagram-preview')){
 const drawing=node.querySelector('svg'),box=drawing.viewBox.baseVal;
 drawing.style.width=box.width+'px';drawing.style.height=box.height+'px';
 const frame=node.getBoundingClientRect(),cx=frame.left+frame.width/2,cy=frame.top+frame.height/2;
 const distance=rect=>(rect.left+rect.width/2-cx)**2+(rect.top+rect.height/2-cy)**2;
 const focus=Array.from(drawing.querySelectorAll('g.node'),element=>element.getBoundingClientRect()).filter(rect=>rect.width&&rect.height).reduce((best,rect)=>!best||distance(rect)<distance(best)?rect:best,null);
 if(focus)drawing.style.transform='translate('+(cx-focus.left-focus.width/2)+'px, '+(cy-focus.top-focus.height/2)+'px)';
}
node.dataset.processed='true';bindFunctions?.(node);}catch{node.removeAttribute('data-processed');node.textContent=source;}}});}
if(graphSources.length)(async()=>{try{const response=await fetch(graphScript.dataset.mermaidSrc);if(!response.ok)throw new Error('Mermaid HTTP '+response.status);graphRenderer=blogMermaid.createRenderer(await response.text());drawGraphs();}catch{notify('다이어그램을 불러오지 못했습니다. 새로고침해 주세요.');}})();
