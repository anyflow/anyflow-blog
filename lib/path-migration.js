'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),matter=require('gray-matter'),MarkdownIt=require('markdown-it');
const md=new MarkdownIt({html:true}),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function makePlan(root){
 const files=cp.execFileSync('git',['-C',root,'ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),mapping={},notes={},ids={};
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'_assets/visuals/manifest.json'),'utf8'));
 for(const file of files.filter(f=>f.endsWith('.md')&&!f.startsWith('.'))){
  const raw=fs.readFileSync(path.join(root,file),'utf8'),{data}=matter(raw);let target=file;
  if(data.kind==='post'&&!file.split('/').some(p=>p.startsWith('_'))){if(!data.permalink)throw new Error('Missing original URL: '+file);target=data.permalink.replace(/^\//,'').replace(/\/$/,'')+'.md';}
  if(data.kind==='root')target='blog.md';
  const oldId=data.post_id||catalog.pages?.[data.permalink]?.pageId?.replaceAll('-','')||(data.permalink?sha(data.permalink).slice(0,32):null);
  if(['post','root'].includes(data.kind)&&data.draft===false)ids[oldId]=data.kind==='root'?'/':data.permalink.replace(/\/$/,'');
  const front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw),removed=[];
  if(front)for(const [index,line]of front[1].split('\n').entries())if(/^(permalink|post_id):/.test(line))removed.push({index,line});
  notes[file]={target,removed};mapping[file]=target;
 }
 const owners=Object.keys(notes).filter(f=>!f.startsWith('_')&&['post','root'].includes(matter(fs.readFileSync(path.join(root,f),'utf8')).data.kind));
 for(const file of files){
  if(mapping[file]||file.startsWith('.'))continue;
  if(file.startsWith('_assets/visuals/covers/'))mapping[file]=file.replace('_assets/visuals/covers/','_assets/_covers/');
  else if(file.startsWith('_assets/visuals/icons/'))mapping[file]=file.replace('_assets/visuals/icons/','_assets/_icons/');
  else if(file==='_assets/visuals/site-icon.png')mapping[file]='_assets/_icons/site-icon.png';
  else if(file==='_assets/visuals/manifest.json')mapping[file]='_assets/_meta/visuals.json';
  else if(file.startsWith('_assets/social/'))mapping[file]=file.replace('_assets/social/','_assets/_social/');
  else if(file.startsWith('_assets/')&&!file.slice(8).includes('/'))mapping[file]='_assets/_meta/'+path.basename(file);
  else if(!file.includes('/'))mapping[file]='_assets/_meta/'+file;
  else{
   const owner=owners.filter(f=>file.startsWith(path.posix.dirname(f)+'/')).sort((a,b)=>b.length-a.length)[0];
   mapping[file]=owner?'_assets/'+notes[owner].target.replace(/\.md$/,'')+'/'+path.basename(file):file;
  }
 }
 const targets=Object.values(mapping);if(new Set(targets).size!==targets.length)throw new Error('Target path collision');
 return {version:1,files:mapping,notes,ids};
}
function removeFields(raw,note,reverse){
 const match=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);if(!match)return raw;
 const lines=match[1].split('\n');if(reverse){for(const item of note.removed)lines.splice(item.index,0,item.line);}else for(let i=lines.length-1;i>=0;i--)if(/^(permalink|post_id):/.test(lines[i]))lines.splice(i,1);
 return raw.replace(match[1],lines.join('\n'));
}
function rewrite(raw,from,to,mapping){
 function destination(value){
  if(!value||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value))return value;
  const wiki=/^!?\[\[([\s\S]+)\]\]$/.exec(value);if(wiki){const [file,...label]=wiki[1].split('|');return value.slice(0,value.indexOf('[['))+ '[['+destination(file)+(label.length?'|'+label.join('|'):'')+']]';}
  const parts=/^([^#?]*)([\s\S]*)$/.exec(value);let clean;try{clean=decodeURIComponent(md.utils.unescapeAll(parts[1]));}catch{clean=parts[1];}
  const candidates=[path.posix.normalize(path.posix.join(path.posix.dirname(from),clean)),clean.replace(/^\//,''),path.posix.join(path.posix.dirname(from),path.posix.basename(clean))];
  if(clean.startsWith('/assets/'))candidates.unshift(clean.slice(8));
  if(!path.posix.extname(clean))candidates.push(...candidates.map(c=>c+'.md'));
  let resolved=candidates.find(c=>Object.hasOwn(mapping,c));
  if(!resolved){const same=Object.keys(mapping).filter(c=>path.posix.basename(c)===path.posix.basename(clean));if(same.length===1)resolved=same[0];}
  if(!resolved)return value;
  return (path.posix.relative(path.posix.dirname(to),mapping[resolved])||path.posix.basename(mapping[resolved]))+parts[2];
 }
 const lines=raw.split('\n');let fence=null,front=lines[0]==='---';
 for(let line=0;line<lines.length;line++){
  const f=/^[ >\t]*(`{3,}|~{3,})([^\n]*)$/.exec(lines[line]);
  if(f){if(!fence)fence={mark:f[1],card:f[2].trim()==='cardlink'};else if(f[1][0]===fence.mark[0]&&f[1].length>=fence.mark.length)fence=null;continue;}
  if(fence&&!fence.card)continue;
  if(line>0&&lines[line]==='---'&&front){front=false;continue;}
  if(front||fence?.card){
   const m=/^(\s*(?:cover|cover_image|hero_image|thumbnail|icon|icon_image|favicon|image):\s*)(.*)$/.exec(lines[line]);
   if(m){try{const v=matter.engines.yaml.parse('value: '+m[2]).value;if(typeof v==='string'){const result=destination(v);if(result!==v)lines[line]=m[1]+JSON.stringify(result);}}catch{}}
   continue;
  }
  let text=lines[line],edits=[];
  // Keep inline code untouched while parsing Markdown destinations with Markdown-it's parser.
  const code=[];for(const m of text.matchAll(/(`+)([\s\S]*?)\1/g))code.push([m.index,m.index+m[0].length]);
  for(let i=0;i<text.length-1;i++)if(text[i]===']'&&text[i+1]==='('&&!code.some(([a,b])=>i>=a&&i<b)){
   let start=i+2;while(text[start]===' ')start++;const parsed=md.helpers.parseLinkDestination(text,start,text.length);
   if(parsed.ok){const changed=destination(parsed.str);if(changed!==parsed.str)edits.push([start,parsed.pos,'<'+changed+'>']);i=parsed.pos-1;}
  }
  for(const m of text.matchAll(/!?\[\[([^\]\n]+)\]\]/g)){const value=destination(m[0]);if(value!==m[0])edits.push([m.index,m.index+m[0].length,value]);}
  for(const m of text.matchAll(/\b(?:src|href)=(['"])(.*?)\1/g)){const value=destination(md.utils.unescapeAll(m[2]));if(value!==m[2]){const start=m.index+m[0].indexOf(m[2]);edits.push([start,start+m[2].length,value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')]);}}
  for(const [start,end,value]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,start)+value+text.slice(end);
  lines[line]=text;
 }
 return lines.join('\n');
}
function rewriteJson(data,mapping,ids){
 if(Array.isArray(data))return data.map(v=>rewriteJson(v,mapping,ids));
 if(data&&typeof data==='object')return Object.fromEntries(Object.entries(data).map(([k,v])=>[ids[k]||mapping[k]||k,rewriteJson(v,mapping,ids)]));
 if(typeof data==='string'){if(mapping[data])return mapping[data];for(const [from,to]of [['_assets/visuals/covers/','_assets/_covers/'],['_assets/visuals/icons/','_assets/_icons/'],['_assets/social/','_assets/_social/']])if(data.includes(from))return data.replaceAll(from,to);}
 return data;
}
function writerRollback(root,plan){
 const sha=plan.rollback?.repositories?.blog?.sha;if(!sha)return [];
 if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Invalid writer rollback commit');
 const read=file=>cp.execFileSync('git',['-C',root,'show',sha+':'+file],{maxBuffer:4*1024*1024});
 const writes=['main.js','manifest.json','styles.css','markdown-it.LICENSE'].map(name=>{const file='.obsidian/plugins/blog-links/'+name;return {file,value:read(file)};});
 const config=path.join(root,'.obsidian/app.json');if(fs.existsSync(config)){
  const current=JSON.parse(fs.readFileSync(config,'utf8')),before=JSON.parse(read('.obsidian/app.json'));
  if(Object.hasOwn(before,'attachmentFolderPath'))current.attachmentFolderPath=before.attachmentFolderPath;else delete current.attachmentFolderPath;
  writes.push({file:'.obsidian/app.json',value:Buffer.from(JSON.stringify(current,null,2)+'\n')});
 }
 const mapping=Object.fromEntries(Object.entries(plan.files).map(([a,b])=>[b,a]));
 function configPaths(value){
  if(Array.isArray(value))return value.map(configPaths);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[mapping[k]||k,configPaths(v)]));
  if(typeof value==='string'){if(mapping[value])return mapping[value];for(const [a,b]of [['_assets/_covers','_assets/visuals/covers'],['_assets/_icons','_assets/visuals/icons'],['_assets/_social','_assets/social']])value=value.replaceAll(a,b);}
  return value;
 }
 for(const file of ['.obsidian/plugins/pexels-banner/data.json','.obsidian/workspace.json'])if(fs.existsSync(path.join(root,file)))writes.push({file,value:Buffer.from(JSON.stringify(configPaths(JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))),null,2)+'\n')});
 return writes;
}
function applyContent(root,plan,reverse=false){
 const mapping=reverse?Object.fromEntries(Object.entries(plan.files).map(([a,b])=>[b,a])):plan.files,ids=reverse?Object.fromEntries(Object.entries(plan.ids).map(([a,b])=>[b,a])):plan.ids,outputs=[];
 const writer=reverse?writerRollback(root,plan):[];
 const extraNotes={};
 if(reverse){
  function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(root,path.join(dir,e.name)).split(path.sep).join('/')]);}
  const current=walk(root);
  for(const file of current.filter(f=>f.endsWith('.md')&&!f.startsWith('_')&&!mapping[f])){
   const data=matter(fs.readFileSync(path.join(root,file),'utf8')).data;if(data.kind!=='post')continue;
   const url='/'+file.replace(/\.md$/,''),legacy=sha(url).slice(0,32),base=path.posix.basename(file,'.md');mapping[file]=file.replace(/\.md$/,'')+'/'+base+'.md';ids[url]=legacy;
   extraNotes[file]={target:file,removed:[{index:0,line:'permalink: '+JSON.stringify(url)},{index:1,line:'post_id: '+JSON.stringify(legacy)}]};
  }
  const owners=Object.entries(mapping).filter(([from,to])=>from.endsWith('.md')&&!from.startsWith('_'));
  for(const file of current.filter(f=>f.startsWith('_assets/')&&!mapping[f])){
   const owner=owners.find(([from])=>file.startsWith('_assets/'+from.replace(/\.md$/,'')+'/'));
   if(owner)mapping[file]=path.posix.dirname(owner[1])+'/'+file.slice(('_assets/'+owner[0].replace(/\.md$/,'')+'/').length);
   else for(const [from,to]of [['_assets/_covers/','_assets/visuals/covers/'],['_assets/_icons/','_assets/visuals/icons/'],['_assets/_social/','_assets/social/']])if(file.startsWith(from))mapping[file]=to+file.slice(from.length);
  }
 }
 for(const [from,to]of Object.entries(mapping)){
  const file=path.join(root,from);if(!fs.existsSync(file))throw new Error('Missing migration file: '+from);
  let value=fs.readFileSync(file),note=reverse?extraNotes[from]||Object.values(plan.notes).find(n=>n.target===from):plan.notes[from];
  if(note)value=Buffer.from(removeFields(rewrite(value.toString(),from,to,mapping),note,reverse));
  else if(from.endsWith('.json')){let data=JSON.parse(value);data=rewriteJson(data,mapping,ids);
   if(from.endsWith('visuals.json')||from.endsWith('manifest.json'))for(const [k,v]of Object.entries(data.emojis||{}))data.emojis[k]=reverse?v.replace(/^_icons\//,'icons/'):v.replace(/^icons\//,'_icons/');
   value=Buffer.from(JSON.stringify(data,null,2)+'\n');
  }
  outputs.push({from,to,value});
 }
 const stage=path.join(root,'.path-layout-stage');if(fs.existsSync(stage))throw new Error('Unfinished migration stage exists');fs.mkdirSync(stage);
 for(const [index,item]of outputs.entries())fs.renameSync(path.join(root,item.from),path.join(stage,String(index)));
 for(const [index,item]of outputs.entries()){const dest=path.join(root,item.to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.renameSync(path.join(stage,String(index)),dest);fs.writeFileSync(dest,item.value);}
 fs.rmdirSync(stage);
 for(const item of writer){const file=path.join(root,item.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,item.value);}
 function empty(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){if(d.name.startsWith('.'))continue;const child=path.join(dir,d.name);if(d.isDirectory()){empty(child);if(!fs.readdirSync(child).length)fs.rmdirSync(child);}}}empty(root);
 return outputs.length;
}
module.exports={makePlan,applyContent,rewrite,sha,writerRollback};
