const katex=require("katex"),texmath=require("markdown-it-texmath"),youtubeThumbnail=require("./youtube"),bookmark=require("./bookmark"),parseYaml=require("gray-matter").engines.yaml.parse;
module.exports=function obsidianMarkdown(md) {
 md.use(texmath,{engine:katex,delimiters:"dollars",katexOptions:{throwOnError:true,strict:"ignore",trust:false}});
 const normal=s=>md.utils.unescapeAll(s.replace(/<[^>]+>/g,"")).replace(/\s+/g," ").trim();
 const plain=tokens=>normal((tokens||[]).map(t=>t.children?plain(t.children):t.type==="softbreak"||t.type==="hardbreak"?" ":["text","code_inline","html_inline"].includes(t.type)?t.content:"").join(""));
 md.core.ruler.after("text_join","obsidian_blocks",state=>{
  const tokens=state.tokens;
  for(const token of tokens)if(token.type==="fence"&&token.info.trim()==="cardlink"){
   try{
    const data=parseYaml(token.content);
    if(!data||typeof data!=="object"||Array.isArray(data)||typeof data.url!=="string"||!data.url.trim())throw new Error("url is required");
    for(const key of ["title","description","image","favicon"])if(data[key]!==undefined&&typeof data[key]!=="string")throw new Error(key+" must be text");
    token.content=bookmark({url:data.url.trim(),title:data.title,description:data.description,cover:data.image,icon:data.favicon},{resolveImage:state.env.resolveImage});
    token.type="html_block";token.tag="";
   }catch(error){throw new Error("Invalid cardlink in "+(state.env.post?.url||"note")+": "+error.message);}
  }

  for(const token of tokens) {
   const markup=token.content.replace(/(\x60+)[\s\S]*?\1/g,"").replace(/\\./g,"");
   for(const child of token.children||[]) if(child.type==="text"&&((child.content.includes("![")&&/!\[/.test(markup))||(/\]\([^\n]*\.md\b/.test(child.content)&&/\]\(/.test(markup))))throw new Error("Malformed Markdown link or image in "+(state.env.post?.url||"note"));
  }
  const inlineAnchors=[];
  for(const [i,token]of tokens.entries()) {
   if(!["paragraph_open","heading_open"].includes(tokens[i-1]?.type))continue;
   const last=token.children?.at(-1),match=last?.type==="text"&&/\s+\^([\w-]+)\s*$/.exec(last.content);
   if(!match||!/(?<!\\)\^[\w-]+\s*$/.test(token.content))continue;
   last.content=last.content.slice(0,match.index);if(!last.content)token.children.pop();
   token.content=token.content.replace(/\s+\^[\w-]+\s*$/,"");
   inlineAnchors.push({token,id:match[1]});
  }
  tokens.forEach((token,i)=>{
   if(token.type==="blockquote_open") {
    const inline=tokens[i+2];if(inline?.type!=="inline")return;
    const match=/^\[!([\w-]+)(?:\|([^\]\n]+))?\]([+-])?(?:[ \t]+([^\n]*))?(?:\n|$)/.exec(inline.content);
    const legacy=/^💡(?:[ \t]+|\n|$)/.exec(inline.content);
    if(!match&&!legacy)return;
    const type=match?.[1].toLowerCase()||"notion",fold=match?.[3]||"";
    const title=type==="notion"?"":match?.[4]||type[0].toUpperCase()+type.slice(1);
    const rest=inline.content.slice((match||legacy)[0].length);
    inline.content=rest;inline.children=md.parseInline(rest,state.env)[0].children;
    if(!rest){tokens[i+1].hidden=true;tokens[i+3].hidden=true;}
    const ratio=type==="column"?Number(match?.[2]??1):null;
    if(type==="column"&&(!Number.isFinite(ratio)||ratio<=0||ratio>1))throw new Error("Invalid column ratio");
    const meta={callout:true,type,fold,ratio,title:md.renderInline(title)};
    token.meta=meta;
    const close=tokens.slice(i+1).find(t=>t.type==="blockquote_close"&&t.level===token.level);
    if(close)close.meta=meta;
   }
   if(token.type==="paragraph_open"&&tokens[i+1]?.children?.length===1&&tokens[i+1].children[0].type==="image"&&!/\.(?:mp3|wav|ogg|m4a|mp4|webm|pdf)$/i.test(tokens[i+1].children[0].attrGet("src"))) {
    const image=tokens[i+1].children[0],dimension=/\|(\d+)(?:x(\d+))?$/.exec(image.content);
    if(dimension){image.content=image.content.slice(0,dimension.index);const altToken=new state.Token("text","",0);altToken.content=image.content;image.children=[altToken];image.attrSet("width",dimension[1]);if(dimension[2])image.attrSet("height",dimension[2]);token.attrSet("style","width:"+dimension[1]+"px;max-width:100%");}
    token.tag="figure";tokens[i+2].tag="figure";
   }

  });
  for(const {token,id}of inlineAnchors.reverse()){
   const index=tokens.indexOf(token),marker=new state.Token("html_block","",0);
   marker.content='<span class="block-anchor" id="'+id+'"></span>';tokens.splice(Math.max(0,index-1),0,marker);
  }
  for(let i=tokens.length-3;i>=0;i--) {
   const token=tokens[i];if(token.type!=="paragraph_open"||!/^\^[\w-]+$/.test(tokens[i+1]?.content||""))continue;
   const marker=tokens[i+1],id=marker.content.slice(1);marker.type="html_block";marker.content='<span class="block-anchor" id="'+id+'"></span>';marker.children=null;
   let previous=i-1;
   if(tokens[previous]?.nesting===-1){const closing=tokens[previous];while(previous>=0){const t=tokens[previous];if(t.nesting===1&&t.level===closing.level&&t.tag===closing.tag)break;previous--;}}
   if(tokens[previous]?.type==="fence")tokens[previous].meta={...tokens[previous].meta,blockId:id};
   tokens.splice(i,3);tokens.splice(Math.max(0,previous),0,marker);
  }
  for(let i=tokens.length-3;i>=0;i--) {
   const children=tokens[i+1]?.children;
   if(tokens[i].type!=="paragraph_open"||tokens[i+1]?.type!=="inline"||tokens[i+2]?.type!=="paragraph_close"||children?.[0]?.type!=="link_open"||children.at(-1)?.type!=="link_close"||children.some(t=>t.type==="image")||children.filter(t=>t.type==="link_open").length!==1)continue;
   const url=children[0].attrGet("href"),title=plain(children.slice(1,-1)),saved=state.env.post?.bookmarks||[];
   const sameUrl=saved.filter(b=>md.normalizeLink(b.url||"")===url),sameTitle=saved.filter(b=>normal(b.title||"")===title);
   const metadata=sameUrl.find(b=>normal(b.title||"")===title)||(sameUrl.length===1?sameUrl[0]:sameTitle.length===1?sameTitle[0]:null);
   if(!metadata&&!youtubeThumbnail(url||""))continue;
   const card=new state.Token("html_block","",0);
   card.content=bookmark({...metadata,url,title});card.level=tokens[i].level;
   tokens.splice(i,3,card);
  }
  // Bind only an explicit caption to the immediately preceding media block.
  for(let i=tokens.length-1;i>=0;i--) {
   const caption=tokens[i];if(caption.type!=="blockquote_open"||caption.meta?.type!=="caption")continue;
   let start=i-1;const end=tokens[start];
   if(end?.nesting===-1)while(start>=0&&!(tokens[start].nesting===1&&tokens[start].level===end.level&&tokens[start].tag===end.tag))start--;
   const media=tokens[start],children=tokens[start+1]?.children;
   const htmlMedia=t=>t?.type==="html_block"&&/<(?:img|audio|video|iframe|svg)\b|class="bookmark(?:\s|")/i.test(t.content);
   const inlineMedia=media?.type==="paragraph_open"&&(children?.length===1&&children[0].type==="image"||/^<(audio|video|iframe|svg)\b[\s\S]*<\/\1>\s*$|^<img\b[^>]*>\s*$/i.test(tokens[start+1]?.content||""));
   if(!media||media.level!==caption.level||!(media.tag==="figure"||inlineMedia||media.type==="fence"&&media.info.trim()==="mermaid"||htmlMedia(media)))continue;
   caption.meta.attached=true;
   if(media.tag==="figure")end.hidden=true;
   else {
    if(inlineMedia){media.hidden=true;end.hidden=true;}
    const open=new state.Token("html_block","",0);open.content='<figure class="media-figure">';open.level=caption.level;
    tokens.splice(start,0,open);
   }
  }

 });
 const icon=type=>["notion","tip","hint","important"].includes(type)?"💡":["warning","caution","attention"].includes(type)?"⚠️":["success","check","done"].includes(type)?"✅":["danger","error","failure","bug"].includes(type)?"❗":"ℹ️";
 md.renderer.rules.blockquote_open=(tokens,i,options,env,self)=>{
  const m=tokens[i].meta;if(!m?.callout)return self.renderToken(tokens,i,options);
  if(m.type==="caption")return m.attached?'<figcaption class="caption">':'<div class="caption">';
  if(m.type==="columns")return '<div class="notion-columns">';
  if(m.type==="column")return '<div class="notion-column" style="--column-ratio:'+m.ratio+'">';
  const symbol='<span class="callout-icon" aria-hidden="true">'+icon(m.type)+'</span>';
  if(m.fold)return '<details class="callout" data-callout="'+m.type+'"'+(m.fold==="+"?" open":"")+'><summary><span class="callout-icon callout-toggle" aria-hidden="true"></span><span class="callout-title">'+m.title+'</span></summary><div class="callout-content">';
  return '<blockquote class="callout">'+symbol+'<div class="callout-content">'+(m.title?'<div class="callout-title">'+m.title+'</div>':"");
 };
 md.renderer.rules.blockquote_close=(tokens,i,options,env,self)=>{
  const m=tokens[i].meta;if(!m?.callout)return self.renderToken(tokens,i,options);
  if(m.type==="caption")return m.attached?"</figcaption></figure>\n":"</div>\n";
  if(["columns","column"].includes(m.type))return "</div>\n";
  return "</div>"+(m.fold?"</details>\n":"</blockquote>\n");
 };

};

