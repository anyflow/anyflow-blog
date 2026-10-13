const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");
const assetTypes = /\.(?:png|jpe?g|webp|gif|svg|avif|heic|html|pdf|mp3|mp4|webm|wav|ogg|m4a|pptx)$/i;
const imageTypes = /\.(?:png|jpe?g|webp|gif|svg|avif)$/i;
const mediaTypes=/\.(?:mp3|wav|ogg|m4a|mp4|webm|pdf)$/i;
const external = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;
const escape = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plain = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\*\*/g, "");
const slug = s => plain(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
function visualPath(value) {
  const raw=String(value||"").trim(),wiki=/^!?\[\[([^\]\r\n]+)\]\]$/.exec(raw);
  return wiki?wiki[1].split("|")[0]:raw;
}
function positionFor(data,fallback) {
  const legacy=data.cover_position||fallback;
  if(data.cover_x==null && data.cover_y==null) return legacy;
  const previous=/^([\d.]+)% ([\d.]+)%$/.exec(legacy);
  const values=[data.cover_x??previous?.[1]??50,data.cover_y??previous?.[2]??50].map(Number);
  if(values.some(n=>!Number.isFinite(n)||n<0||n>100)) throw new Error("Cover position must be between 0 and 100");
  return values.map(n=>n+"%").join(" ");
}
function walk(root) {
  return fs.readdirSync(root, {withFileTypes:true}).flatMap(e => {
    if(e.name.startsWith(".")) return [];
    const p = path.join(root,e.name);
    return e.isDirectory() ? walk(p) : e.isFile() ? [p] : [];
  });
}
function loadContent(root = process.env.BLOG_CONTENT_DIR || ".cache/blog", visualsPath = "src/_data/visuals.json") {
  root = path.resolve(root);
  if(!fs.existsSync(root)) throw new Error("Content repository missing. Run make sync first.");
  root=fs.realpathSync(root);
  const visuals = fs.existsSync(visualsPath) ? JSON.parse(fs.readFileSync(visualsPath,"utf8")) : {};
  const catalogPath=path.join(root,"_assets/visuals/manifest.json");
  const catalog=fs.existsSync(catalogPath)?JSON.parse(fs.readFileSync(catalogPath,"utf8")):{emojis:{}};
  let home=null;
  const files = walk(root), assets = new Map(), unresolved = new Set(), sources = new Map();
  const md = new MarkdownIt({html:true,breaks:true,linkify:true});
  const posts = files.filter(f=>f.endsWith(".md")).flatMap(source=> {
    const raw=fs.readFileSync(source,"utf8"),{data, content}=matter(raw);
    if(data.kind==="post" && data.draft===false && !/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(raw)) throw new Error("Invalid frontmatter delimiter: "+source);
    const imported=Boolean(catalog.pages?.[data.permalink]);
    if(data.kind==="page" && data.permalink==="/" && data.draft===false) {
      if(home) throw new Error("Duplicate home page metadata");
      const visual=visuals["/"]||{};
      home={faviconSource:data.favicon||"",title:String(data.title||""),icon:data.icon??(imported?"":visual.icon??"🌼"),cover:imported || Object.hasOwn(data,"cover") || Object.hasOwn(data,"cover_image") ? "" : visual.cover || "",coverSource:data.cover??data.cover_image??"",coverPosition:positionFor(data,visual.coverPosition||"50% 0%"),iconImageSource:data.icon_image||"",source};
      return [];
    }
    if(data.kind!=="post" || data.draft!==false) return [];
    if(!data.title || !data.permalink || !data.created || !data.category) throw new Error("Missing required post metadata: "+source);
    let decoded;
    try { decoded=decodeURIComponent(data.permalink); } catch { throw new Error("Invalid permalink: "+source); }
    const segments=decoded.replace(/\/$/, "").split("/").slice(1);
    if(typeof data.permalink!=="string" || !decoded.startsWith("/") || decoded==="/" || /[\s%?#\\\u0000-\u001f]/.test(decoded) || segments.some(s=>!s || s==="." || s==="..")) throw new Error("Invalid permalink: "+source);
    const url = decoded.replace(/\/$/, "")+"/";
    const date = new Date(data.created);
    if(Number.isNaN(date.valueOf())) throw new Error("Invalid created date: "+source);
    const visual = visuals[data.permalink] || {};
    const properties = visual.properties || [];
    const originalTags = properties.slice(1).map(t=>t.text);
    const authoredTags=Array.isArray(data.tags)?data.tags:(data.tags?[String(data.tags)]:[]);
    const sameTags=JSON.stringify(authoredTags)===JSON.stringify(visual.sourceTags);
    const post = {...data, title:plain(md.renderInline(String(data.title))), summary:plain(md.renderInline(String(data.summary||""))), url, source, content,
      date:date.toISOString().slice(0,10), displayDate:date.toISOString().slice(0,10).replaceAll("-","/"),
      tags:sameTags && originalTags.length ? originalTags : authoredTags.filter(t=>t!=="post"),
      icon:data.icon ?? (imported?"":visual.icon??"📝"), cover:imported || Object.hasOwn(data,"cover") || Object.hasOwn(data,"cover_image") ? "" : visual.cover || "", coverSource:data.cover ?? data.cover_image ?? "", coverPosition:positionFor(data,visual.coverPosition||"50% 50%"), iconImageSource:data.icon_image||"",
      tagStyles:Object.fromEntries(properties.map(t=>[t.text,(t.style||"").match(/(?:^|;)background\s*:\s*([^;]+)/)?.[1]||""])), toc:[]};
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
    if(/^https?:\/\/(www\.)?anyflow\.net\//.test(raw)) {const url=new URL(raw);const internal=posts.find(p=>p.url===url.pathname.replace(/\/$/,"")+"/");if(internal) return internal.url+url.hash;}
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
    const raw=visualPath(post.iconImageSource||post.icon);
    post.iconIsImage=Boolean(post.iconImageSource)||imageTypes.test(raw.split(/[?#]/)[0]);
    const emoji=catalog.emojis?.[raw];
    const iconSource=post.iconIsImage?raw:emoji?"_assets/visuals/"+emoji:"";
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
    const id=base+(n>1?"-"+n:"");tokens[i].attrSet("id",id);
    env.post.toc.push({id,text,level:Number(tokens[i].tag[1])});
    return heading(tokens,i,options,env,self);
  };
  const fence=md.renderer.rules.fence;
  md.renderer.rules.fence=(tokens,i,options,env,self)=> {
    if(tokens[i].info.trim()==="mermaid") return '<pre class="mermaid">'+escape(tokens[i].content)+'</pre>';
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
    md.renderer.rules[kind]=(tokens,i,options,env)=>!env.post ? tokens[i].content : tokens[i].content.replace(/<(img|audio|video|source|iframe|a)\b[^>]*>/gi,(tag,name)=>tag.replace(/\s(src|href)=["']([^"']+)["']/g,(all,attribute,url)=>external.test(url)?all:' '+attribute+'="'+escape(resolveUrl(url,env.post.source,name.toLowerCase()==="img"&&attribute==="src"))+'"'));
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
    post.html=md.render(normalized,{post,ids:{}});
    let thumbnail=post.thumbnail || post.hero_image;
    const resolved=thumbnail && resolveLocal(thumbnail,post.source);
    post.thumbnail=resolved && imageTypes.test(resolved) ? resolveUrl(thumbnail,post.source,true) : post.firstImage || "";
    post.preview=(post.html.replace(/<p class="notion-empty-paragraph"[^>]*><br><\/p>/g,"").match(/<(h[1-6]|p|ul|ol)\b[^>]*>[\s\S]*?<\/\1>/g)||[]).slice(0,4).join("").replace(/<\/?a\b[^>]*>/g, "").replace(/\s+id="[^"]*"/g, "");
    delete post.content; delete post.source; delete post.coverSource;
  }
  posts.sort((a,b)=>b.date.localeCompare(a.date)||a.url.localeCompare(b.url));
  if(home) {applyVisuals(home,home.source);home.favicon=home.faviconSource?resolveUrl(visualPath(home.faviconSource),home.source,true):home.iconImage||"";if(home.faviconSource&&!home.favicon)throw new Error("Missing favicon attachment");delete home.faviconSource;delete home.source;}
  return {posts,home,assets,unresolved:[...unresolved]};
}
module.exports={loadContent,slug,escape};
