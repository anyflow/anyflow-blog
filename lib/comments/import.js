const {noteUrl}=require('../content-layout');
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const matter=require('gray-matter'),{parseDocument,DomUtils}=require('htmlparser2');
const hash=value=>createHash('sha256').update(value).digest('hex');
const children=(node,name)=>(node?.children||[]).filter(child=>child.type==='tag'&&child.name===name);
const child=(node,name)=>children(node,name)[0];
const value=(node,name)=>DomUtils.textContent((name?child(node,name):node)||{children:[]}).trim();
const sourceId=node=>node?.attribs?.['dsq:id']||node?.attribs?.id||'';
const stableId=(provider,id)=>provider+'-'+(/^[A-Za-z0-9_-]{1,90}$/.test(id)?id:hash(id).slice(0,40));
function walk(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')?[]:e.isDirectory()?walk(path.join(root,e.name)):e.isFile()?[path.join(root,e.name)]:[]);}
function alias(raw){
  let text=String(raw||'').trim().normalize('NFC');
  try{if(/^https?:\/\//i.test(text))text=new URL(text).pathname;}catch{return '';}
  try{text=decodeURIComponent(text);}catch{}
  const uuid=text.match(/(?:^|[^a-f0-9])([a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12})(?:$|[^a-f0-9])/i);
  if(uuid)return uuid[1].replaceAll('-','').toLowerCase();
  return text.startsWith('/')?text.replace(/\/+$/,'')+'/':text.replace(/\s+/g,' ');
}
function postCatalog(root){
  root=fs.realpathSync(root);
  const file=path.join(root,'_assets/_meta/visuals.json');
  const visuals=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{pages:{}};
  const posts=[],aliases=new Map();
  for(const filename of walk(root).filter(p=>p.endsWith('.md'))){
    const {data}=matter(fs.readFileSync(filename,'utf8'));
    const relative=path.relative(root,filename).split(path.sep).join('/');
    if(relative.split('/').some(part=>part.startsWith('_'))||data.publish!==true)continue;
    const permalink=noteUrl(relative);
    const visual=visuals.pages?.[permalink]||{};
    const id=permalink;
    if(posts.some(post=>post.id===id))throw new Error('Duplicate stable post_id: '+id);
    const post={id,permalink,title:String(data.title),note:path.relative(root,filename).split(path.sep).join('/')};
    posts.push(post);
    for(const raw of [id,permalink,data.title,visual.pageId,visual.url,visual.sourceUrl,visual.source,post.note,...(Array.isArray(data.aliases)?data.aliases:[])]){
      const key=alias(raw);if(!key)continue;
      if(!aliases.has(key))aliases.set(key,id);else if(aliases.get(key)!==id)aliases.set(key,null);
    }
  }
  return {root,posts,aliases};
}
function matchPost(catalog,keys){
  // Conflicting exact aliases must be reviewed; a title never overrules a URL.
  const found=new Set(keys.map(alias).filter(Boolean).map(key=>catalog.aliases.get(key)).filter(Boolean));
  return found.size===1?[...found][0]:null;
}
function plainBody(html){
  const document=parseDocument(String(html),{decodeEntities:true});
  function render(node){
    if(node.type==='text')return node.data;
    if(['script','style','iframe','object','noscript'].includes(node.name))return '';
    if(node.name==='br')return '\n';
    if(node.name==='img')return node.attribs?.alt||'';
    const text=(node.children||[]).map(render).join('');
    if(node.name==='a'){
      const href=node.attribs?.href||'';
      return /^https?:\/\//i.test(href)&&text.trim()!==href?text+' ('+href+')':text;
    }
    if(['p','div','blockquote','pre','ul','ol','li'].includes(node.name))return text+'\n\n';
    return text;
  }
  return render(document).replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function iso(raw){
  const match=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)?$/.exec(raw);if(!match)return null;
  const [year,month,day,hour,minute,second]=match.slice(1,7).map(Number),calendar=new Date(Date.UTC(year,month-1,day));
  if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||calendar.getUTCDate()!==day||hour>23||minute>59||second>59)return null;
  if(!match[7])return raw;
  const parsed=new Date(raw);return Number.isNaN(parsed.valueOf())?null:parsed.toISOString();
}
function disqusImport(xml,catalog,{adminUsernames=[]}={}){
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('XML DTD/entities are not accepted');
  if(!/<\/disqus>\s*$/.test(xml))throw new Error('Incomplete Disqus XML export');
  const doc=parseDocument(xml,{xmlMode:true,decodeEntities:true});
  const root=child(doc,'disqus');if(!root)throw new Error('Expected Disqus XML export');
  const threads=new Map(),comments=[],review=[],legacyLikes={};
  for(const thread of children(root,'thread')){
    const keys=[value(thread,'id'),value(thread,'link')];
    let postId=matchPost(catalog,keys);
    if(!postId&&!keys.some(key=>catalog.aliases.has(alias(key))))postId=matchPost(catalog,[value(thread,'title')]);
    threads.set(sourceId(thread),{postId,keys,title:value(thread,'title')});
  }
  for(const post of children(root,'post')){
    const originalId=sourceId(post),thread=threads.get(sourceId(child(post,'thread')));
    const author=child(post,'author'),bodyHtml=value(post,'message'),body=plainBody(bodyHtml);
    const createdAt=iso(value(post,'createdAt')),parentOriginalId=sourceId(child(post,'parent'))||null;
    const errors=[];
    if(!originalId)errors.push('missing_source_id');if(!thread?.postId)errors.push('unmatched_thread');
    if(!value(author,'name'))errors.push('missing_author');if(!body)errors.push('empty_body');if(!createdAt)errors.push('invalid_created_at');
    if(value(post,'isSpam')==='true')errors.push('spam');
    const deleted=value(post,'isDeleted')==='true';
    let link=value(author,'url');try{const url=new URL(link);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)link='';}catch{link='';}
    const record={id:stableId('disqus',originalId||hash(bodyHtml)),post_id:thread?.postId||null,parent_id:parentOriginalId?stableId('disqus',parentOriginalId):null,
      author:{name:value(author,'name'),link,is_admin:value(author,'isModerator')==='true'||adminUsernames.includes(value(author,'username'))},body:deleted?'삭제된 댓글입니다':body,created_at:createdAt,updated_at:iso(value(post,'updatedAt')),status:deleted?'deleted':'published',owner_hash:null,legacy:true,
      source:{provider:'disqus',id:originalId,thread_id:sourceId(child(post,'thread')),thread_keys:thread?.keys||[],username:value(author,'username'),message_html:bodyHtml}};
    if(errors.length)review.push({record,reasons:errors});else{
      comments.push(record);
      const likes=value(post,'likes');if(/^\d+$/.test(likes)&&Number.isSafeInteger(Number(likes)))legacyLikes['comment:'+record.id]=Number(likes);
    }
  }
  return {comments,review,legacyLikes,sourceCount:children(root,'post').length};
}
function backupInventory(catalog){
  const inventory=[];
  for(const post of catalog.posts){
    const source=fs.readFileSync(path.join(catalog.root,post.note),'utf8'),lines=source.split(/(?<=\n)/);let offset=0;
    for(let i=0;i<lines.length;i++){
      const start=offset;offset+=lines[i].length;
      const label=/^> \[![^\]]+\][+-]?\s*([^\n]*)/.exec(lines[i])?.[1];
      const callout=label!==undefined&&/^댓글\s*(?:백업|backup)$/i.test(plainBody(label).replace(/^[*_]+|[*_]+$/g,""));
      const guestbook=post.permalink==='/'&&/^[-*] \*\*방명록\s*백업\*\*/.test(lines[i]);
      if(!callout&&!guestbook)continue;
      let raw=lines[i],j=i+1;while(j<lines.length&&((guestbook?/^(?: {2,}|\t)/:/^[ \t]*>/).test(lines[j])||!lines[j].trim()))raw+=lines[j++];
      const images=[...raw.matchAll(/!\[[^\]]*\]\(<?([^)>]+)>?\)/g)].map(m=>path.posix.join(path.posix.dirname(post.note),decodeURIComponent(m[1])));
      inventory.push({post_id:post.id,note:post.note,start,end:start+raw.length,sha256:hash(raw),raw,images});
      offset+=raw.length-lines[i].length;i=j-1;
    }
  }
  return inventory;
}
function ocrCandidates(ocr,inventory){
  const candidates=[];
  for(const image of ocr){
    const block=inventory.find(entry=>entry.note===image.note&&entry.images.includes(image.image));if(!block)continue;
    const rows=(image.lines||[]).filter(line=>line.x>=0.07&&line.x<0.90&&line.text.trim()&&!/^(?:[:;•]|답글)$/.test(line.text.trim())).sort((a,b)=>a.y-b.y);
    let start=0,ordinal=0;const ancestors=[];
    for(let i=0;i<rows.length;i++){
      const date=/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2})/.exec(rows[i].text);if(!date)continue;
      const segment=rows.slice(start,i);start=i+1;if(!segment.length)continue;
      const id=stableId('backup',image.image+'#'+(++ordinal)),name=segment[0].text;
      const depth=segment[0].x>0.14?1:0,parent=depth?ancestors[0]||null:null;
      if(!depth)ancestors[0]=id;
      const local=date.slice(1).map((v,n)=>n===0?v:v.padStart(2,'0'));
      candidates.push({candidate_id:id,post_id:block.post_id,parent_candidate_id:parent,author:{name,link:'',is_admin:false},body:segment.slice(1).map(line=>line.text).join('\n'),created_at:null,reviewed:false,
        source:{provider:'backup-image',id:image.image+'#'+ordinal,note:image.note,image:image.image,local_time:`${local[0]}-${local[1]}-${local[2]}T${local[3]}:${local[4]}:00`,timezone:null,precision:'minute',ocr_lines:segment.concat(rows[i]),indent_depth:depth},
        review_reasons:['ocr_needs_source_comparison','timezone_not_recorded',...(depth?['reply_relationship_needs_source_comparison']:[])]});
    }
    if(!ordinal||start<rows.length)candidates.push({candidate_id:stableId('backup',image.image+'#unparsed'),post_id:block.post_id,reviewed:false,source:{provider:'backup-image',image:image.image,note:image.note,ocr_lines:rows.slice(start)},review_reasons:['missing_or_clipped_author_date']});
  }
  return candidates;
}
function approvedBackups(entries,catalog){
  const comments=[],review=[];
  for(const item of entries){
    const postId=matchPost(catalog,[item.post_id,item.permalink,item.note]),createdAt=iso(item.created_at||'');
    const unknownDate=item.created_at===null&&item.source?.precision==='unknown'&&item.source?.provider==='backup-image'&&Boolean(item.source.image);
    const reasons=[];
    if(item.reviewed!==true)reasons.push('not_reviewed');if(!postId)reasons.push('unmatched_post');if(!createdAt&&!unknownDate)reasons.push('missing_exact_created_at');
    if(!item.author?.name||!item.body)reasons.push('missing_author_or_body');
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(item.id||item.candidate_id||stableId('backup',item.source?.id||'')))reasons.push('invalid_id');
    if((item.parent_id||item.parent_candidate_id)&&! /^[A-Za-z0-9_-]{1,128}$/.test(item.parent_id||item.parent_candidate_id))reasons.push('invalid_parent_id');
    if(!item.source?.id||!['backup-image','backup-text'].includes(item.source.provider))reasons.push('missing_provenance');
    if(reasons.length){review.push({record:item,reasons});continue;}
    comments.push({id:item.id||item.candidate_id||stableId('backup',item.source.id),post_id:postId,parent_id:item.parent_id||item.parent_candidate_id||null,
      author:{name:item.author.name,link:item.author.link||'',is_admin:item.author.is_admin===true},body:String(item.body),created_at:createdAt,updated_at:null,status:item.source.visibility==='private'?'pending':'published',owner_hash:null,legacy:true,source:item.source});
  }
  return {comments,review};
}
function mergeImports(groups){
  const comments=[],review=groups.flatMap(g=>g.review||[]),duplicates=[],legacyLikes=Object.assign({},...groups.map(g=>g.legacyLikes||{})),sourceIds=new Map(),exact=new Map(),remap=new Map();
  for(const record of groups.flatMap(g=>g.comments||[])){
    const sourceKey=record.source.provider+':'+record.source.id;
    const exactKey=JSON.stringify([record.post_id,record.author.name,record.body,record.created_at]);
    const sameBody=record.created_at?exact.get(exactKey):null;
    const previous=sourceIds.get(sourceKey)||(sameBody?.source.provider!==record.source.provider?sameBody:null);
    if(previous){
      if(previous.post_id!==record.post_id||previous.author.name!==record.author.name||previous.body!==record.body||previous.created_at!==record.created_at){review.push({record,reasons:['conflicting_source_id']});continue;}
      duplicates.push({id:record.id,canonical_id:previous.id,source:record.source});remap.set(record.id,previous.id);continue;
    }
    comments.push(record);sourceIds.set(sourceKey,record);exact.set(exactKey,record);
  }
  for(const record of comments)if(remap.has(record.parent_id))record.parent_id=remap.get(record.parent_id);
  // Keep uncertain/missing parents private instead of flattening or guessing a conversation.
  let changed=true;
  while(changed){changed=false;const indexed=new Map(comments.map(record=>[record.id,record]));
    for(let i=comments.length-1;i>=0;i--){
      const record=comments[i],parent=indexed.get(record.parent_id);let reason;
      if(parent?.status==='pending'&&record.status==='published'){record.status='pending';changed=true;}
      if(record.parent_id&&(!parent||parent.post_id!==record.post_id))reason='missing_or_cross_post_parent';
      const seen=new Set([record.id]);let ancestor=parent;
      while(ancestor&&!reason){if(seen.has(ancestor.id)){reason='cyclic_parent';break;}seen.add(ancestor.id);ancestor=indexed.get(ancestor.parent_id);}
      if(reason){review.push({record,reasons:[reason]});comments.splice(i,1);changed=true;}
    }
  }
  const valid=new Set(comments.map(c=>'comment:'+c.id));for(const key of Object.keys(legacyLikes))if(!valid.has(key))delete legacyLikes[key];
  return {comments:comments.sort((a,b)=>String(a.created_at??'\uffff').localeCompare(String(b.created_at??'\uffff'))||a.id.localeCompare(b.id)),review,duplicates,legacyLikes};
}
module.exports={hash,alias,postCatalog,matchPost,plainBody,disqusImport,backupInventory,ocrCandidates,approvedBackups,mergeImports};
