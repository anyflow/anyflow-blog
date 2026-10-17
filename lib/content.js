const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");
const {noteUrl}=require("./content-layout");
const MarkdownIt = require("markdown-it");
const youtubeThumbnail=require("./youtube");
const {xPostId}=require("./x"),{readXCache}=require("./x-cache");
const {readCardImages,cardImage}=require("./card-images");
const assetTypes = /\.(?:ico|png|jpe?g|webp|gif|svg|avif|heic|html|pdf|mp3|mp4|webm|wav|ogg|m4a|pptx)$/i;
const imageTypes = /\.(?:ico|png|jpe?g|webp|gif|svg|avif)$/i;
const mediaTypes=/\.(?:mp3|wav|ogg|m4a|mp4|webm|pdf)$/i;
const external = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;
const escape = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plain = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\*\*/g, "");
const slug = s => plain(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
function visualPath(value) {
  const raw=String(value||"").trim(),wiki=/^!?\[\[([^\]\r\n]+)\]\]$/.exec(raw);
  return wiki?wiki[1].split("|")[0]:raw;
}
function walk(root) {
  return fs.readdirSync(root, {withFileTypes:true}).flatMap(e => {
    if(e.name.startsWith(".")) return [];
    const p = path.join(root,e.name);
    return e.isDirectory() ? walk(p) : e.isFile() ? [p] : [];
  });
}
function loadContent(root = process.env.BLOG_CONTENT_DIR || ".cache/blog", xImages=readXCache(),cardImages=readCardImages()) {
  root = path.resolve(root);
  if(!fs.existsSync(root)) throw new Error("Content repository missing. Run make sync first.");
  root=fs.realpathSync(root);
  const catalogPath=path.join(root,"_assets/_meta/visuals.json");
  const catalog=fs.existsSync(catalogPath)?JSON.parse(fs.readFileSync(catalogPath,"utf8")):{emojis:{}};
  const bookmarkPath=path.join(root,"_assets/_meta/bookmarks.json");
  const bookmarkCatalog=fs.existsSync(bookmarkPath)?JSON.parse(fs.readFileSync(bookmarkPath,"utf8")):{version:1,posts:{}};
  if(bookmarkCatalog.version!==1||!bookmarkCatalog.posts||typeof bookmarkCatalog.posts!=="object"||Array.isArray(bookmarkCatalog.posts))throw new Error("Invalid bookmark catalog");
  const linkMetadata=require("./link-cache").readLinkCache(root),linkRequests=new Set();
  let home=null;
  const files = walk(root), assets = new Map(), unresolved = new Set(), sources = new Map(), xPosts=new Set();
  const md = new MarkdownIt({html:true,breaks:true,linkify:true});
  const matchLinks=md.linkify.match.bind(md.linkify);
  md.linkify.match=text=>matchLinks(text)?.filter(link=>link.schema || !/^[^./:\s]+\.md$/i.test(link.raw));
  const posts = files.filter(f=>f.endsWith(".md")&&!path.relative(root,f).split(path.sep).some(p=>p.startsWith("_"))).flatMap(source=> {
    const raw=fs.readFileSync(source,"utf8"),{data, content}=matter(raw);
    if(Object.hasOwn(data,"publish") && typeof data.publish!=="boolean") throw new Error("publish must be a boolean: "+source);
    if(data.publish===true && !/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(raw)) throw new Error("Invalid frontmatter delimiter: "+source);
    const relative=path.relative(root,source).split(path.sep).join("/"),derivedUrl=data.publish===true?noteUrl(relative):null;
    if(relative==="blog.md" && data.publish===true) {
      if(home) throw new Error("Duplicate home page metadata");
      home={content,toc:[],summary:String(data.summary||""),faviconSource:data.favicon||"",title:String(data.title||""),icon:data.icon??"",cover:"",coverSource:data.cover??data.cover_image??"",coverPosition:"50% 0%",source};
      return [];
    }
    if(data.publish!==true) return [];
    if(Object.hasOwn(data,"noindex") && typeof data.noindex!=="boolean") throw new Error("noindex must be a boolean: "+source);
    if(!data.title || !data.created || !data.category) throw new Error("Missing required post metadata: "+source);
    if(typeof data.category!=="string"||!data.category.trim()) throw new Error("category must be nonempty text: "+source);
    const url=derivedUrl;
    const date = new Date(data.created);
    if(Number.isNaN(date.valueOf())) throw new Error("Invalid created date: "+source);
    const authoredTags=Array.isArray(data.tags)?data.tags:(data.tags?[String(data.tags)]:[]);
    const id=url;
    const bookmarks=bookmarkCatalog.posts[id]||[];
    if(!Array.isArray(bookmarks))throw new Error("Invalid bookmark catalog for "+id);
    const post = {...data, id, bookmarks, aliases:[url,catalog.pages?.[url]?.source,catalog.pages?.[url]?.pageId,catalog.pages?.[url]?.pageId?.replaceAll("-","")].filter(Boolean), title:md.utils.unescapeAll(plain(md.renderInline(String(data.title)))), summary:md.utils.unescapeAll(plain(md.renderInline(String(data.summary||"")))), url, source, content,
      date:date.toISOString().slice(0,10), displayDate:date.toISOString().slice(0,10).replaceAll("-","/"),
      tags:authoredTags,
      icon:data.icon ?? "", cover:"", coverSource:data.cover ?? data.cover_image ?? "", coverPosition:"50% 50%",
      toc:[]};
    if([...sources.values()].some(p=>p.url===url)) throw new Error("Duplicate permalink: "+url);
    sources.set(source,post);
    return [post];
  });
  function resolveLocal(raw, source) {
    let clean=raw.split(/[?#]/)[0];
    try { clean=decodeURIComponent(clean); } catch {}
    clean=clean.replace(/\\([ _()[\]])/g,"$1");
    const candidates = [path.resolve(path.dirname(source), clean),path.resolve(root,clean.replace(/^BLOG\//,""))];
    // Legacy Notion export paths retain obsolete folder names; each post owns its attachments.
    candidates.push(path.join(path.dirname(source),path.basename(clean)));
    const local=candidates.find(p => p.startsWith(root+path.sep) && fs.existsSync(p) && fs.statSync(p).isFile() && fs.realpathSync(p).startsWith(root+path.sep));
    if(local) return local;
    const sameName=files.filter(p=>path.basename(p).normalize("NFC")===path.basename(clean).normalize("NFC"));
    return sameName.length===1 ? sameName[0] : undefined;
  }
  function resolveUrl(raw, source, image=false) {
    if(raw.startsWith("/assets/") && [...assets.values()].includes(raw)) return raw;
    const fragment=value=>{try{value=decodeURIComponent(value);}catch{}return value.startsWith("^")?value.slice(1):slug(value);};
    if(raw.startsWith("#")) return "#"+fragment(raw.slice(1));
    if(!image && (/^\/(?!\/)/.test(raw) || /^https?:\/\/(?:(?:www|blog)\.)?anyflow\.net\//.test(raw))) {const url=new URL(raw,"https://blog.anyflow.net"),pathname=decodeURIComponent(url.pathname).replace(/\/$/,"");if(!pathname) return "/"+url.search+url.hash;const internal=posts.find(p=>p.url===pathname);if(internal) return internal.url+url.search+url.hash;}
    if(external.test(raw)) return raw;
    let file;
    try { file=resolveLocal(raw,source); } catch { file=null; }
    if(file && home?.source===file) return "/";
    if(file && sources.has(file)) return sources.get(file).url+(raw.includes("#")?"#"+fragment(raw.split("#")[1]):"");
    if(file && assetTypes.test(file)) {
      if(image && !imageTypes.test(file) && !mediaTypes.test(file)) throw new Error("Unsupported web image format: "+raw+" in "+source);
      const relative = path.relative(root,file).split(path.sep).join("/");
      const url="/assets/"+relative.split("/").map(encodeURIComponent).join("/");
      assets.set(file,url);
      return url;
    }
    unresolved.add(path.relative(root,source)+": "+raw);
    return image ? "" : raw;
  }
  require("./obsidian-markdown")(md);
  function applyVisuals(post,source) {
    const raw=visualPath(post.icon);
    post.iconIsImage=imageTypes.test(raw.split(/[?#]/)[0]);
    const emoji=catalog.emojis?.[raw];
    const iconSource=post.iconIsImage?raw:emoji?"_assets/"+emoji:"";
    post.iconImage=iconSource?resolveUrl(iconSource,source,true):"";
    if(iconSource && !post.iconImage) throw new Error("Missing icon attachment: "+iconSource);
    if(post.coverSource) {
      post.cover=resolveUrl(visualPath(post.coverSource),source,true);
      if(!post.cover) throw new Error("Missing cover attachment: "+post.coverSource);
    }
    delete post.coverSource;delete post.iconImageSource;
  }
  const defaultImage=md.renderer.rules.image;
  md.renderer.rules.image=(tokens,i,options,env,self)=> {
    const token=tokens[i], url=resolveUrl(token.attrGet("src"),env.post.source,true);
    if(!url) return '<span class="missing-image">'+escape(token.content)+'</span>';
    if(mediaTypes.test(url)){const tag=/\.(?:mp3|wav|ogg|m4a)$/i.test(url)?"audio":"video";if(/\.pdf$/i.test(url))return '<iframe class="pdf-embed" title="PDF" src="'+escape(url)+'"></iframe>';return "<"+tag+' controls preload="metadata" src="'+escape(url)+'"></'+tag+">";}
    token.attrSet("src",url);token.attrSet("loading","lazy");token.attrSet("decoding","async");
    if(!env.post.firstImage && imageTypes.test(url.split("?")[0])) env.post.firstImage=url;
    env.cardMedia?.push({type:"image",url});
    return defaultImage(tokens,i,options,env,self);
  };
  const defaultLink=md.renderer.rules.link_open || ((tokens,i,options,env,self)=>self.renderToken(tokens,i,options));
  md.renderer.rules.link_open=(tokens,i,options,env,self)=> {
    tokens[i].attrSet("href",resolveUrl(tokens[i].attrGet("href"),env.post.source));
    if(/^https?:/.test(tokens[i].attrGet("href"))) tokens[i].attrSet("rel","noopener noreferrer");
    const close=tokens.findIndex((t,j)=>j>i && t.type==="link_close" && t.level===tokens[i].level);
    const label=tokens.slice(i+1,close).filter(t=>["text","code_inline"].includes(t.type)).map(t=>t.content).join("");
    const referenced=posts.find(p=>p.url===tokens[i].attrGet("href").split("#")[0] && p.title===label);
    if(referenced) {
      tokens[i].attrSet("class","page-mention");tokens[close].meta={...tokens[close].meta,pageMention:true};
      const icon=referenced.iconImage?'<img src="'+escape(referenced.iconImage)+'" alt="" loading="lazy">':referenced.iconIsImage?"":escape(referenced.icon||"");
      return defaultLink(tokens,i,options,env,self)+(icon?'<span class="page-mention-icon" aria-hidden="true">'+icon+'</span>':"")+'<span class="page-mention-title">';
    }
    return defaultLink(tokens,i,options,env,self);
  };
  md.renderer.rules.link_close=(tokens,i,options,env,self)=>(tokens[i].meta?.pageMention?"</span>":"")+self.renderToken(tokens,i,options);
  const heading=md.renderer.rules.heading_open || ((tokens,i,options,env,self)=>self.renderToken(tokens,i,options));
  md.renderer.rules.heading_open=(tokens,i,options,env,self)=> {
    const text=(tokens[i+1].children||[]).filter(t=>["text","code_inline"].includes(t.type)).map(t=>t.content).join(""), base=slug(text)||"section";
    const n=(env.ids[base]||0)+1;env.ids[base]=n;
    const id=tokens[i].attrGet("id")||base+(n>1?"-"+n:"");tokens[i].attrSet("id",id);
    env.post.toc.push({id,text,level:Number(tokens[i].tag[1])});
    return heading(tokens,i,options,env,self);
  };
  const fence=md.renderer.rules.fence;
  md.renderer.rules.fence=(tokens,i,options,env,self)=> {
    if(tokens[i].info.trim()==="mermaid") {
      env.cardMedia?.push({type:"mermaid",code:tokens[i].content,id:tokens[i].meta?.blockId});
      return '<pre class="mermaid">'+escape(tokens[i].content)+'</pre>';
    }
    const language=tokens[i].info.trim().split(/\s/)[0];
    return '<div class="code-block"><button class="copy-code" type="button">복사</button>'+fence(tokens,i,options,env,self)+'<span class="code-language">'+escape(language.toUpperCase())+'</span></div>';
  };
  md.inline.ruler.before("link","wikilink",(state,silent)=> {
    const match=/^(!?)\[\[([^\]\n]+)\]\]/.exec(state.src.slice(state.pos));
    if(!match) return false;
    if(!silent) {
      let [target,label]=match[2].split("|");
      if(!path.extname(target.split("#")[0])) target=target.replace(/(#.*)?$/, ".md$1");
      if(match[1] && (imageTypes.test(target.split("#")[0])||mediaTypes.test(target.split("#")[0]))) {
        const token=state.push("image","img",0);
        token.attrs=[["src",target],["alt",""]];token.content=(label && !/^\d+(?:x\d+)?$/.test(label)?label:path.basename(target))+(label && /^\d+(?:x\d+)?$/.test(label)?"|"+label:"");
        token.children=[];md.inline.parse(token.content,md,state.env,token.children);
      } else {
        const url=resolveUrl(target,state.env.post.source,Boolean(match[1]));
        const token=state.push("html_inline","",0);token.content='<a href="'+escape(url)+'">'+escape(label||target.replace(/\.md$/, ""))+'</a>';
      }
    }
    state.pos+=match[0].length;return true;
  });
  for(const kind of ["html_block","html_inline"]) {
    md.renderer.rules[kind]=(tokens,i,options,env)=>!env.post ? tokens[i].content : tokens[i].content.replace(/<(img|audio|video|source|iframe|a)\b[^>]*>/gi,(tag,name)=>{
      let imageUrl;
      const converted=tag.replace(/\s(src|href)=["']([^"']+)["']/g,(all,attribute,url)=>{
        const resolved=resolveUrl(md.utils.unescapeAll(url),env.post.source,name.toLowerCase()==="img"&&attribute==="src");
        if(attribute==="src"){if(name.toLowerCase()==="img")imageUrl=resolved;else if(name.toLowerCase()==="iframe"){const id=xPostId(resolved);if(id){xPosts.add(id);imageUrl=xImages[id];}else imageUrl=youtubeThumbnail(resolved);}}
        return resolved===url?all:' '+attribute+'="'+escape(resolved)+'"';
      });
      if(imageUrl&&!/\bclass=["'][^"']*\bbookmark-icon\b/.test(tag)&&!mediaTypes.test(imageUrl.split(/[?#]/)[0]))env.cardMedia?.push({type:"image",url:imageUrl});
      return converted;
    });
  }
  for(const post of posts) applyVisuals(post,post.source);
  for(const post of posts) {
    // Imported image destinations may contain spaces or parentheses that Markdown cannot parse.
    let codeFence=null;
    const normalized=post.content.replace(/^.*$/gm,line=> {
      const fence=/^\s*(`{3,}|~{3,})/.exec(line);
      if(fence) { if(!codeFence) codeFence=fence[1]; else if(fence[1][0]===codeFence[0] && fence[1].length>=codeFence.length) codeFence=null; return line; }
      if(codeFence) return line;
      const image=/^!\[(.*)\]\((.*)\)[ \t]*$/.exec(line);
      if(!image) return line;
      const raw=image[2].replace(/^<|>$/g,"");
      const resolved=resolveUrl(raw,post.source,true);
      return resolved ? '!['+image[1]+']('+resolved+')' : line;
    });
    const env={post,linkMetadata,linkRequests,ids:{},cardMedia:[],resolveImage:raw=>resolveUrl(visualPath(raw),post.source,true)};
    post.html=md.render(normalized,env);
    const media=env.cardMedia[0];
    post.thumbnail=media?.type==="image"?media.url:"";
    post.thumbnailDiagram=media?.type==="mermaid"?media.code:"";
    post.ogImage=cardImage(post,cardImages);
    post.preview=(post.html.replace(/<p class="notion-empty-paragraph"[^>]*><br><\/p>/g,"").match(/<(h[1-6]|p|ul|ol)\b[^>]*>[\s\S]*?<\/\1>/g)||[]).slice(0,4).join("").replace(/<\/?a\b[^>]*>/g, "").replace(/\s+id="[^"]*"/g, "");
    delete post.content; delete post.source; delete post.coverSource;
  }
  posts.sort((a,b)=>b.date.localeCompare(a.date)||a.url.localeCompare(b.url));
  if(home) {home.id="/";home.aliases=["/",catalog.pages?.["/"]?.source,catalog.pages?.["/"]?.pageId,catalog.pages?.["/"]?.pageId?.replaceAll("-","")].filter(Boolean);applyVisuals(home,home.source);home.favicon=home.faviconSource?resolveUrl(visualPath(home.faviconSource),home.source,true):home.iconImage||"";if(home.faviconSource&&!home.favicon)throw new Error("Missing favicon attachment");delete home.faviconSource;home.bookmarks=bookmarkCatalog.posts[home.id]||[];const env={post:home,linkMetadata,linkRequests,ids:{},cardMedia:[],resolveImage:raw=>resolveUrl(visualPath(raw),home.source,true)};home.sections=require("./home")(home,md,env,posts,raw=>resolveUrl(raw,home.source));delete home.content;delete home.source;}
  return {posts,home,assets,unresolved:[...unresolved],xPosts:[...xPosts],linkRequests:[...linkRequests]};
}
module.exports={loadContent,slug,escape};
