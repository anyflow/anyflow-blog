const path=require('node:path');
module.exports=function renderHome(home,md,env,posts,resolveUrl){
 const tokens=md.parse(home.content,env),sections=[];let section;
 for(const token of tokens){
  if(!section||token.type==='heading_open'&&token.tag==='h2'&&token.level===0){section={tokens:[]};sections.push(section);}
  section.tokens.push(token);
 }
 function link(tokens,i){
  if(tokens[i]?.type!=='paragraph_open'||tokens[i].level!==0||tokens[i+2]?.type!=='paragraph_close')return;
  const c=tokens[i+1]?.children||[];
  if(c[0]?.type!=='link_open'||c.at(-1)?.type!=='link_close'||c.filter(t=>t.type==='link_open').length!==1||c.some(t=>t.type==='image'))return;
  return {url:c[0].attrGet('href'),label:c.slice(1,-1).filter(t=>['text','code_inline'].includes(t.type)).map(t=>t.content).join('')};
 }
 function slot(tokens,i){const l=link(tokens,i);if(!l)return;let file;try{file=decodeURIComponent(l.url);}catch{return;}return {'최근 포스트.csv':'recent','Blog.csv':'categories'}[path.basename(file)];}
 const slots=new Set();
 return sections.map(section=>{
  const tokens=section.tokens,parts=[];let buffer=[];
  const kind=tokens.map((_,i)=>slot(tokens,i)).find(Boolean);
  const header=tokens[0]?.type==='heading_open'&&tokens[0].tag==='h2'?tokens[0]:null;
  if(kind&&header){const id=kind==='recent'?'recent':'by-category';header.attrSet('id',id);env.ids[id]=1;}
  function flush(){if(buffer.length){parts.push({kind:'html',html:md.renderer.render(buffer,md.options,env)});buffer=[];}}
  let profile=false;
  for(let i=0;i<tokens.length;i++){
   const dynamic=slot(tokens,i);
   if(dynamic){if(slots.has(dynamic))throw new Error('Duplicate home list: '+dynamic);slots.add(dynamic);flush();parts.push({kind:dynamic});i+=2;continue;}
   if(tokens[i].type==='bullet_list_open'&&tokens[i].level===0){
    const end=tokens.findIndex((t,j)=>j>i&&t.type==='bullet_list_close'&&t.level===0),l=link(tokens,end+1);
    const target=l&&posts.find(p=>p.url===resolveUrl(l.url).split(/[?#]/)[0]);
    if(target){
     profile=true;if(header&&!header.attrGet('id')){header.attrSet('id','who-and-why');env.ids['who-and-why']=1;}
     flush();tokens[i].attrJoin('class','profile-links');parts.push({kind:'profileLinks',html:md.renderer.render(tokens.slice(i,end+1),md.options,env),link:target,label:l.label,displayUrl:l.url});i=end+3;continue;
    }
   }
   buffer.push(tokens[i]);
  }
  flush();return {className:kind==='recent'?'recent':kind==='categories'?'category-section':profile?'profile':'home-markdown',id:header?.attrGet('id')||'',parts};
 });
};
