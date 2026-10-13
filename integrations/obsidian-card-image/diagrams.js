const MarkdownIt=require('./vendor/markdown-it.min.js');
const youtubeThumbnail=require('../../lib/youtube');
const {xPostId}=require('../../lib/x');
const markdown=new MarkdownIt({html:true});
function diagrams(source){
 const lines=source.split('\n'),offsets=[];let offset=0;
 for(const line of lines){offsets.push(offset);offset+=line.length+1;}
 return markdown.parse(source,{}).filter(t=>t.type==='fence'&&t.info.trim()==='mermaid').map(t=>{
  const closing=/^([\t >]*)(`{3,}|~{3,})[\t \r]*$/.exec(lines[t.map[1]-1]||'');
  const closed=Boolean(closing&&closing[2][0]===t.markup[0]&&closing[2].length>=t.markup.length);
  const after=lines.slice(t.map[1]).map(line=>line.replace(/^[\t >]*/,'').trim()).find(Boolean)||'';
  return {code:t.content,markdown:t.markup+'mermaid\n'+t.content+t.markup+'\n',start:offsets[t.map[0]],end:offsets[t.map[1]]??source.length,prefix:closing?.[1]||'',closed,id:/^\^([\w-]+)$/.exec(after)?.[1]||''};
 });
}
function withBlockId(source,diagram,id){
 if(diagram.id)return source;
 if(!diagram.closed)throw new Error('Mermaid 코드 블록을 먼저 닫아 주세요.');
 const newline=source.includes('\r\n')?'\r\n':'\n';
 const before=source.slice(0,diagram.end),after=source.slice(diagram.end);
 return before+(before.endsWith('\n')?'':newline)+diagram.prefix+'^'+id+newline+after;
}
function socialEmbeds(source){
 const offsets=[];let offset=0;
 for(const line of source.split('\n')){offsets.push(offset);offset+=line.length+1;}
 const videos=[];
 for(const token of markdown.parse(source,{})){
  for(const part of token.type==='inline'?token.children||[]:[token]){
   if(!['html_block','html_inline'].includes(part.type))continue;
   for(const match of part.content.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)){
    const url=youtubeThumbnail(match[1]),id=xPostId(match[1]),position=source.indexOf(match[0],offsets[token.map?.[0]]||0);
    if(url)videos.push({type:'youtube',url,position});
    else if(id)videos.push({type:'x',id,position});
   }
  }
 }
 return videos;
}
module.exports={diagrams,withBlockId,socialEmbeds};
