const fs=require("node:fs"),path=require("node:path"),{createHash}=require("node:crypto");
const matter=require("gray-matter"),md=new (require("markdown-it"))({html:true});
const text=a=>(a||[]).map(x=>x[0]).join("");
const escape=s=>String(s).replace(/([\\\x60*_[\]<>#|!~])/g,"\\$1");
const html=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uuid=s=>String(s).replaceAll("-","").toLowerCase();
function importNotion(root,reference,aliases={},imageMap={}) {
 root=fs.realpathSync(root);
 for(const p of Object.values(reference)){const file=path.resolve(root,p.vaultPath);if(!file.startsWith(root+path.sep)||!fs.realpathSync(file).startsWith(root+path.sep))throw new Error("Import path outside vault");}
 const catalog=JSON.parse(fs.readFileSync(path.join(root,"_assets/visuals/manifest.json")));
 const pages=new Map(),owners=new Map(),anchors=new Set(),media=[],report={pages:[],types:{},emptyPageLinks:[],unresolvedSourceFragments:[],unresolvedBlockMentions:[],omittedMetadata:0};
 for(const p of Object.values(catalog.pages)) if(p.vaultPath) pages.set(uuid(p.pageId),p);
 const blocks=new Map(Object.entries(aliases));
 for(const [url,p] of Object.entries(reference))for(const b of p.blocks){blocks.set(b.id,b);owners.set(uuid(b.id),{url,p,b});}
 const columnOwners=new Map();
 for(const p of Object.values(reference)){
  const local=new Map(p.blocks.map(b=>[b.id,b]));
  function mark(id,row){if(columnOwners.has(uuid(id)))return;columnOwners.set(uuid(id),row);for(const child of local.get(id)?.content||[])mark(child,row);}
  for(const b of p.blocks)if(b.type==="column_list")mark(b.id,b.id);
 }
 function internal(raw,source) {
  const [base,fragment]=raw.split("#"),ids=base.split("?")[0].match(/[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/ig);
  const id=ids?.at(-1),target=(id&&pages.get(uuid(id)))||Object.entries(catalog.pages).find(([url,p])=>p.vaultPath&&base.replace(/^https?:\/\/(?:www\.)?anyflow\.net/,"").replace(/\/$/,"")===url)?.[1];
  if(!target) return raw;
  let result=path.relative(path.dirname(source),target.vaultPath).split(path.sep).join("/")||path.basename(source);
  if(fragment&&target.vaultPath!=="blog.md"){const owner=owners.get(uuid(fragment));if(owner){const id=uuid(columnOwners.get(uuid(owner.b.id))||owner.b.id);anchors.add(id);result+="#^"+id;}else if(!report.unresolvedSourceFragments.some(x=>x.page===target.vaultPath&&x.fragment===fragment))report.unresolvedSourceFragments.push({page:target.vaultPath,fragment,fallback:"post"});}
  return result;
 }
 const wrap=(tag,body)=>body.split(/(\n\s*\n)/).map(s=>s.trim()?"<"+tag+">"+s+"</"+tag+">":s).join("");
 function rich(a,source) {
  return (a||[]).map(([value,marks=[]])=>{
   let s=escape(value),url=null;
   for(const mark of marks) {
    const [type,arg]=mark;
    if(type==="p"){const p=pages.get(uuid(arg)),owner=owners.get(uuid(arg));s=escape(p?.title||text(blocks.get(arg)?.properties?.title)||"원문 참조");url=p?internal(arg,source):owner?internal(owner.p.pageID+"#"+arg,source):"https://www.anyflow.net/"+arg;if(!p&&!owner&&!report.unresolvedBlockMentions.includes(arg))report.unresolvedBlockMentions.push(arg);}
    else if(type==="d")s=escape([arg.start_date,arg.start_time].filter(Boolean).join(" "));
    else if(type==="lm"){s=escape(arg.title||value);url=internal(arg.href,source);}
    else if(type==="eoi"){const b=blocks.get(arg);s=escape(b?.format?.uri||value);url=b?.format?.original_url||b?.format?.uri;}
    else if(type==="e")s="$"+arg+"$";
    else if(type==="a")url=internal(arg,source);
    else if(type==="c"){const f="\x60".repeat(Math.max(1,...(value.match(/\x60+/g)||[]).map(x=>x.length+1)));s=f+(value.startsWith("\x60")?" ":"")+value+(value.endsWith("\x60")?" ":"")+f;}
    else if(!["b","i","s","_","h"].includes(type))throw new Error("Unknown rich text annotation: "+type);
   }
   if(!s.trim())return s;
   const leading=s.match(/^\s*/)[0],trailing=s.match(/\s*$/)[0];let body=s.trim();
   if(body){for(const [type,arg]of [...new Map(marks.map(m=>[m[0],m])).values()]){if(type==="b")body=wrap("strong",body);if(type==="i")body=wrap("em",body);if(type==="s")body=wrap("del",body);if(type==="_")body="<u>"+body+"</u>";if(type==="h")body="<mark>"+body+"</mark>";}
    if(url)body="["+body+"](<"+url.replaceAll(">", "%3E")+">)";}
   return leading+body+trailing;
  }).join("");
 }
 // Resolve every source fragment before serializing the targeted blocks.
 for(const p of Object.values(reference))for(const b of p.blocks)for(const a of Object.values(b.properties||{}))rich(a,p.vaultPath);
 const fileKey=s=>s.normalize("NFC").toLowerCase().replace(/[ _]/g,"");
 function attachment(b,p) {
  if(b.type==="image"){const image=imageMap[b.id];if(!image)throw new Error("Verified image mapping required: "+b.id);const file=path.resolve(root,image.path);if(!file.startsWith(root+path.sep)||!fs.realpathSync(file).startsWith(root+path.sep)||createHash("sha256").update(fs.readFileSync(file)).digest("hex")!==image.sha256)throw new Error("Image verification failed: "+b.id);return path.relative(path.dirname(p.vaultPath),image.path).split(path.sep).map(s=>encodeURIComponent(s)).join("/");}
  const dir=path.dirname(p.vaultPath),raw=text(b.properties?.source),title=text(b.properties?.title);
  let base="";try{base=decodeURIComponent(raw.split(/[?#]/)[0].split("/").at(-1)||"");}catch{}
  let matches=fs.readdirSync(path.join(root,dir)).filter(f=>[title,base].some(n=>fileKey(n)===fileKey(f)));
  // Exported HTML attachments can be shared by posts in different folders.
  if(!matches.length && /\.html$/i.test(base)) {
   const candidates=Object.values(reference).flatMap(x=>{const d=path.dirname(x.vaultPath);return fs.readdirSync(path.join(root,d)).filter(f=>fileKey(f)===fileKey(base)).map(f=>path.join(d,f));});
   const unique=[...new Set(candidates)];if(unique.length===1)return path.relative(dir,unique[0]).split(path.sep).join("/");
  }
  if(matches.length>1)throw new Error("Ambiguous attachment: "+p.vaultPath+" "+b.id);
  if(matches.length===1){let name=matches[0];if(/\.heic$/i.test(name)){const jpeg=name.replace(/\.heic$/i,".jpg");if(fs.existsSync(path.join(root,dir,jpeg)))name=jpeg;}
   return "./"+name.split("/").map(encodeURIComponent).join("/");}
  throw new Error("Missing attachment: "+p.vaultPath+" "+b.id);
 }
 function serialize(p) {
  const byId=new Map(p.blocks.map(b=>[b.id,b]));
  const quote=s=>s.split("\n").map(line=>">"+(line?" "+line:"")).join("\n");
  const sequence=ids=>ids.map(id=>render(byId.get(id)||blocks.get(id))).filter(Boolean).join("\n\n");
  function render(b) {
   if(!b)throw new Error("Missing block");
   report.types[b.type]=(report.types[b.type]||0)+1;
   const value=rich(b.properties?.title,p.vaultPath),children=()=>sequence(b.content||[]);
   let result="";
   switch(b.type) {
    case "page":result=children();break;
    case "text":result=value;if(b.content?.length)result+="\n\n"+children();break;
    case "header":case "sub_header":case "sub_sub_header":result=({"header":"## ","sub_header":"### ","sub_sub_header":"#### "}[b.type])+value;if(b.content?.length)result+="\n\n"+children();break;
    case "bulleted_list":case "numbered_list":result=(b.type==="bulleted_list"?"- ":"1. ")+value.replaceAll("\n","\n   ");if(b.content?.length)result+="\n\n"+children().split("\n").map(l=>"   "+l).join("\n");break;
    case "quote":result=quote([value,children()].filter(Boolean).join("\n\n"));break;
    case "callout":result=quote("[!notion]\n\n"+[value,children()].filter(Boolean).join("\n\n"));break;
    case "toggle":result=quote("[!abstract]- "+value+"\n\n"+children());break;
    case "column_list":result=quote("[!columns]\n\n"+children());break;
    case "column": {
     const ratio=Number(b.format?.column_ratio);
     if(!Number.isFinite(ratio)||ratio<=0||ratio>1)throw new Error("Invalid column ratio: "+b.id);
     result=quote("[!column|"+Number(ratio.toFixed(6))+"]\n\n"+children());break;
    }
    case "code": {
     const code=text(b.properties?.title),language=text(b.properties?.language).toLowerCase().replace(/\s+/g,"-");
     // Oopy reads these configuration blocks as page metadata and hides them.
     if(/(?:^|\n)cleanUrl:\s*\//.test(code)&&/(?:^|\n)(?:title|description|floatFirstTOC):/.test(code)){report.omittedMetadata++;break;}
     const fence="\x60".repeat(Math.max(3,...(code.match(/\x60+/g)||[]).map(x=>x.length+1)));
     result=fence+language+"\n"+code+"\n"+fence;break;
    }
    case "image": {
     const caption=rich(b.properties?.caption,p.vaultPath),alt=md.utils.unescapeAll(md.renderInline(caption).replace(/<[^>]+>/g,"")).replace(/\s+/g," ").replace(/([\\[\]])/g,"\\$1");
     const width=b.format?.block_page_width||b.format?.block_full_width?null:b.format?.block_width;
     result="!["+alt+(width?"|"+Math.round(width):"")+"](<"+attachment(b,p)+">)"+(anchors.has(uuid(b.id))?" ^"+uuid(b.id):"")+(caption?"\n\n"+caption:"");break;
    }
    case "file":result="["+escape(text(b.properties?.title)||"첨부 파일")+"](<"+attachment(b,p)+">)";break;
    case "audio":result="![](<"+attachment(b,p)+">)";break;
    case "video":case "embed": {
     const src=b.format?.display_source||text(b.properties?.source);
     if(!/^https?:\/\//.test(src))throw new Error("Invalid embed source: "+b.id);
     result='<iframe src="'+html(src)+'" title="'+html(value||b.type)+'" loading="lazy" allowfullscreen style="width:100%;height:'+Math.round(b.format?.block_height||400)+'px;border:0"></iframe>';break;
    }
    case "bookmark":result="["+escape(text(b.properties?.title)||text(b.properties?.link))+"](<"+text(b.properties?.link)+">)";break;
    case "external_object_instance":{const url=b.format?.original_url||b.format?.uri;result="["+escape(url)+"](<"+url+">)";break;}
    case "alias":{const target=b.format.alias_pointer.id,pg=pages.get(uuid(target));result="["+escape(pg?.title||text(blocks.get(target)?.properties?.title)||target)+"](<"+(pg?internal(target,p.vaultPath):"https://www.anyflow.net/"+target)+">)";break;}
    case "link_to_page":report.emptyPageLinks.push({page:p.vaultPath,block:b.id});break;
    case "table_of_contents":break;
    case "divider":result="---";break;
    case "equation":result="$$\n"+text(b.properties?.title)+"\n$$";break;
    case "table": {
     const cols=b.format.table_block_column_order,rows=(b.content||[]).map(id=>byId.get(id));
     const line=row=>"| "+cols.map(c=>rich(row?.properties?.[c],p.vaultPath).replaceAll("|","\\|").replaceAll("\n","<br>")).join(" | ")+" |";
     result=[line(rows[0]),"| "+cols.map(()=>"---").join(" | ")+" |",...rows.slice(1).map(line)].join("\n");
     report.types.table_row=(report.types.table_row||0)+rows.length;break;
    }
    default:throw new Error("Unsupported block type: "+b.type);
   }
   if(anchors.has(uuid(b.id))&&result&&b.type!=="image")result+="\n\n^"+uuid(b.id);
   return result;
  }
  return render(byId.get(p.pageID)).trim()+"\n";
 }
 // Construct all results before replacing any note.
 const writes=Object.values(reference).map(p=>{
  const file=path.join(root,p.vaultPath),before=fs.readFileSync(file,"utf8"),parsed=matter(before);
  const opening=before.indexOf("\n---",4);if(opening<0)throw new Error("Missing frontmatter: "+file);
  if(parsed.data.kind!=="post"||parsed.data.draft!==false)throw new Error("Import target is not a published post: "+file);
  const header=before.slice(0,opening+4),body=serialize(p),after=header+"\n\n"+body;
  report.pages.push({path:p.vaultPath,before:createHash("sha256").update(before).digest("hex"),after:createHash("sha256").update(after).digest("hex")});
  return {file,after,data:parsed.data};
 });
 for(const w of writes){if(JSON.stringify(matter(w.after).data)!==JSON.stringify(w.data))throw new Error("Metadata changed: "+w.file);}
 for(const w of writes)fs.writeFileSync(w.file,w.after);
 return {...report,media,anchors:anchors.size};
}
if(require.main===module){const [root,reference,aliasFile,reportFile,imageMapFile]=process.argv.slice(2);const result=importNotion(root,JSON.parse(fs.readFileSync(reference)),aliasFile?JSON.parse(fs.readFileSync(aliasFile)):{},imageMapFile?JSON.parse(fs.readFileSync(imageMapFile)):{});fs.writeFileSync(reportFile||".cache/notion-import-report.json",JSON.stringify(result,null,2));console.log(JSON.stringify({pages:result.pages.length,media:result.media.length,anchors:result.anchors,omittedMetadata:result.omittedMetadata,types:result.types,emptyPageLinks:result.emptyPageLinks}));}
module.exports={importNotion};

