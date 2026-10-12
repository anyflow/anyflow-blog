const katex=require("katex"),texmath=require("markdown-it-texmath");
module.exports=function obsidianMarkdown(md) {
 md.use(texmath,{engine:katex,delimiters:"dollars",katexOptions:{throwOnError:true,strict:"ignore",trust:false}});
 const normal=s=>md.utils.unescapeAll(s.replace(/<[^>]+>/g,"")).replace(/\s+/g," ").trim();
 const plain=tokens=>normal((tokens||[]).map(t=>t.children?plain(t.children):t.type==="softbreak"||t.type==="hardbreak"?" ":["text","code_inline","html_inline"].includes(t.type)?t.content:"").join(""));
 md.core.ruler.after("text_join","obsidian_blocks",state=>{
  const tokens=state.tokens;
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
    const caption=plain(image.children);let accumulated="",end=-1;
    for(let j=i+3;caption&&j+2<tokens.length;j+=3) {
     if(tokens[j].type!=="paragraph_open"||tokens[j].level!==token.level||tokens[j+1].type!=="inline")break;
     const current=plain(tokens[j+1].children);accumulated=normal(accumulated+" "+current);
     if(!caption.startsWith(accumulated))break;
     if(accumulated===caption){end=j;break;}
    }
    token.tag="figure";tokens[i+2].tag="figure";
    if(end>=0) {
     tokens[i+2].meta={captionStart:true};
     for(let j=i+3;j<=end;j+=3)tokens[j].attrSet("class","caption");
     tokens[end+2].meta={captionEnd:true};
    }
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
   if(tokens[previous]?.meta?.captionEnd){while(previous>=0&&!(tokens[previous].tag==="figure"&&tokens[previous].nesting===1))previous--;}
   else if(tokens[previous]?.nesting===-1){const closing=tokens[previous];while(previous>=0){const t=tokens[previous];if(t.nesting===1&&t.level===closing.level&&t.tag===closing.tag)break;previous--;}}
   tokens.splice(i,3);tokens.splice(Math.max(0,previous),0,marker);
  }
 });
 const icon=type=>["notion","tip","hint","important"].includes(type)?"💡":["warning","caution","attention"].includes(type)?"⚠️":["success","check","done"].includes(type)?"✅":["danger","error","failure","bug"].includes(type)?"❗":"ℹ️";
 md.renderer.rules.blockquote_open=(tokens,i,options,env,self)=>{
  const m=tokens[i].meta;if(!m?.callout)return self.renderToken(tokens,i,options);
  if(m.type==="columns")return '<div class="notion-columns">';
  if(m.type==="column")return '<div class="notion-column" style="--column-ratio:'+m.ratio+'">';
  const symbol='<span class="callout-icon" aria-hidden="true">'+icon(m.type)+'</span>';
  if(m.fold)return '<details class="callout" data-callout="'+m.type+'"'+(m.fold==="+"?" open":"")+'><summary>'+symbol+'<span class="callout-title">'+m.title+'</span></summary><div class="callout-content">';
  return '<blockquote class="callout">'+symbol+'<div class="callout-content">'+(m.title?'<div class="callout-title">'+m.title+'</div>':"");
 };
 md.renderer.rules.blockquote_close=(tokens,i,options,env,self)=>{
  const m=tokens[i].meta;if(!m?.callout)return self.renderToken(tokens,i,options);
  if(["columns","column"].includes(m.type))return "</div>\n";
  return "</div>"+(m.fold?"</details>\n":"</blockquote>\n");
 };
 md.renderer.rules.paragraph_close=(tokens,i,options,env,self)=>tokens[i].meta?.captionStart?"<figcaption>\n":tokens[i].meta?.captionEnd?"</p></figcaption></figure>\n":self.renderToken(tokens,i,options);
};

