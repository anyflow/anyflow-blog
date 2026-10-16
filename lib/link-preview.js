const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function webUrl(value){try{const u=new URL(String(value));return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function githubResource(value){
 const u=new URL(webUrl(value)||'https://invalid/');if(u.hostname!=='github.com')return null;
 const m=/^\/([^/]+)\/([^/]+)(?:\/(issues|pull)\/(\d+)|\/(blob|tree)\/(.+))?\/?$/.exec(u.pathname);
 return m?{owner:m[1],repo:m[2],kind:m[3]?'issue':m[5]?'file':'repo',file:m[6]?.split('/').slice(1).join('/')||'',number:m[4]||'',api:'https://api.github.com/repos/'+m[1]+'/'+m[2]+(m[3]?'/issues/'+m[4]:'')}:null;
}
function issueIcon(state){return '<svg class="bookmark-icon mention-icon issue-icon" viewBox="0 0 16 16" aria-hidden="true" style="color:'+(state==='closed'?'#8250df':'#1a7f37')+'"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>'+(state==='closed'?'<path d="m5 8 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/>':'<circle cx="8" cy="8" r="1.5" fill="currentColor"/>')+'</svg>';}
function mention(url,data={},label=''){
 if(!webUrl(url))throw new Error('Invalid mention URL');
 const issue=data.kind==='issue',title=data.title||label||url,icon=issue?issueIcon(data.state):webUrl(data.icon)?'<img class="bookmark-icon mention-icon" src="'+escape(data.icon)+'" alt="" loading="lazy">':'';
 const provider=issue?'#'+data.number:data.provider||'';
 return '<a class="link-mention" href="'+escape(url)+'" rel="noopener noreferrer">'+icon+(provider?'<span class="mention-provider">'+escape(provider)+'</span> ':'')+'<span class="mention-title">'+escape(title)+'</span>'+(issue&&data.state?' <span class="issue-badge">'+issueIcon(data.state)+escape(data.state==='closed'?'Closed':'Open')+'</span>':'')+'</a>';
}
function preview(url,data={}){
 if(!webUrl(url))throw new Error('Invalid preview URL');
 const supported=githubResource(url);if(!supported)return '';
 const avatar=webUrl(data.avatar),icon=webUrl(data.icon)||'https://github.com/favicon.ico';
 return '<a class="github-preview" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer"><span class="github-avatar"><img class="bookmark-icon" src="'+escape(avatar||icon)+'" alt="" loading="lazy">'+(avatar?'<img class="bookmark-icon github-brand" src="'+escape(icon)+'" alt="" loading="lazy">':'')+'</span><span class="github-details"><span class="github-name">'+escape(data.title===supported.owner+'/'+supported.repo?supported.repo:data.title||supported.file||supported.repo)+'</span><span class="github-owner">'+escape(data.author||supported.owner)+(data.updated?' · '+escape(data.updated.slice(0,10))+' 업데이트':' · GitHub')+(data.state?' · '+escape(data.state==='closed'?'Closed':'Open'):'')+'</span></span></a>\n';
}
const decode=require('markdown-it')().utils.unescapeAll;
function pageMetadata(html,url){
 const fields={};for(const tag of html.match(/<meta\s[^>]*>/gi)||[]){const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1].toLowerCase()]=decode(m[2]??m[3]);if(attrs.property||attrs.name)fields[attrs.property||attrs.name]=attrs.content;}
 const title=fields['og:title']||fields['twitter:title']||decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]).trim();
 const absolute=v=>{if(!v)return '';try{return webUrl(new URL(v,url).href);}catch{return '';}};
 const favicon=(html.match(/<link\s[^>]*>/gi)||[]).find(t=>/rel=["'][^"']*\bicon\b/i.test(t));
 return {title,description:fields['og:description']||fields.description||'',cover:absolute(fields['og:image']||''),icon:absolute(/href=["']([^"']+)/i.exec(favicon||'')?.[1]||'/favicon.ico'),provider:fields['og:site_name']||new URL(url).hostname};
}
async function metadata(url,request){
 if(!webUrl(url))throw new Error('Invalid link URL');const gh=githubResource(url);
 if(gh){const data=JSON.parse(await request(gh.api));return {title:gh.kind==='issue'?data.title:gh.kind==='file'?gh.file:data.name,description:data.description||'',provider:'GitHub',author:data.owner?.login||gh.owner,avatar:data.owner?.avatar_url||data.user?.avatar_url||'',updated:data.updated_at||'',kind:gh.kind,number:String(data.number||gh.number||''),state:data.state||'',icon:'https://github.com/favicon.ico'};}
 return pageMetadata(await request(url),url);
}
module.exports={webUrl,githubResource,mention,preview,pageMetadata,metadata};
