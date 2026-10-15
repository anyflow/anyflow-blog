const md=new(require("markdown-it"))({html:true,breaks:true,linkify:true});
// Keep delimiter edge cases as HTML; identical rendering is required.
function normalizeMarkdown(source){
 const lines=source.split("\n"),tokens=md.parse(source,{}),protectedLines=new Set();
 for(const t of tokens)if(["fence","code_block","html_block"].includes(t.type)&&t.map)for(let i=t.map[0];i<t.map[1];i++)protectedLines.add(i);
 let bold=0,blankLines=0;
 for(let i=0;i<lines.length;i++){
  if(protectedLines.has(i)||!lines[i].includes("<strong>"))continue;
  let line=lines[i];
  const matches=[...line.matchAll(/(?<!\\)<strong>([^\n]*?)<\/strong>/g)];
  for(const m of matches.reverse()){
   const candidate=line.slice(0,m.index)+"**"+m[1]+"**"+line.slice(m.index+m[0].length);
   if(md.renderInline(candidate)===md.renderInline(line)){line=candidate;bold++;}
  }
  lines[i]=line;
 }
 const remove=new Set(),siblings=new Map();
 for(const t of tokens){
  if(t.type==="bullet_list_open"||t.type==="ordered_list_open")siblings.delete(t.level+1);
  if(t.type!=="list_item_open")continue;
  const previous=siblings.get(t.level);siblings.set(t.level,t.map[0]);
  if(previous===undefined)continue;
  for(let i=t.map[0]-1;i>previous&&/^\s*(?:>\s*)*$/.test(lines[i]);i--)remove.add(i);
 }
 const result=lines.filter((_,i)=>!remove.has(i)).join("\n");blankLines=remove.size;
 // Lists may become tight, but their content, nesting and inline rendering must stay identical.
 const shape=s=>md.parse(s,{}).map(t=>[t.type,t.tag,t.nesting,t.level,t.type==="inline"?md.renderInline(t.content):t.content,t.attrs]);
 if(JSON.stringify(shape(source))!==JSON.stringify(shape(result)))throw new Error("Markdown structure changed");
 return {source:result,bold,blankLines};
}
module.exports=normalizeMarkdown;
