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
let graphDraw=Promise.resolve();
function drawGraphs(){if(typeof mermaid==='undefined')return;graphDraw=graphDraw.then(async()=>{const graphs=graphSources.filter(({node})=>!node.closest('[hidden]'));mermaid.initialize({startOnLoad:false,theme:root.dataset.theme==='dark'?'dark':'default',securityLevel:'strict'});graphs.forEach(({node,source})=>{node.removeAttribute('data-processed');node.textContent=source;});try{await mermaid.run({nodes:graphs.map(g=>g.node)});}catch{graphs.forEach(({node,source})=>node.textContent=source);}});}
if(graphSources.length){const script=document.createElement('script');script.src='/js/vendor/mermaid.min.js';script.onload=drawGraphs;document.head.append(script);}
