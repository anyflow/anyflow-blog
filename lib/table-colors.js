const colors=['gray','brown','orange','yellow','green','blue','purple','pink','red'];
const marker=/^\s*\{bg:(gray|brown|orange|yellow|green|blue|purple|pink|red)\}[ \t]*/;
function cellColor(text){return marker.exec(text);}
function colorMarkdown(md){
 md.core.ruler.after('inline','cell_backgrounds',state=>{
  for(let i=0;i<state.tokens.length;i++){
   const token=state.tokens[i];if(!['td_open','th_open'].includes(token.type))continue;
   const inline=state.tokens[i+1],first=inline?.children?.[0];if(first?.type!=='text')continue;
   const match=cellColor(first.content);if(!match)continue;
   token.attrSet('data-cell-bg',match[1]);first.content=first.content.slice(match[0].length);inline.content=inline.content.replace(marker,'');
  }
 });
}
function cellRange(line,column){
 const pipes=[];let escaped=false;
 for(let i=0;i<line.length;i++){const c=line[i];if(c==='|'&&!escaped)pipes.push(i);escaped=c==='\\'?!escaped:false;}
 const leading=/^[ \t]*(?:>[ \t]*)*\|/.test(line),bounds=[...(leading?[]:[-1]),...pipes,...(/\|[ \t]*$/.test(line)?[]:[line.length])];
 if(column<0||column+1>=bounds.length)throw new Error('셀 위치를 확인할 수 없습니다.');
 return {from:bounds[column]+1,to:bounds[column+1]};
}
function setCellColor(line,column,color){
 if(color&&!colors.includes(color))throw new Error('지원하지 않는 셀 색상입니다.');
 const {from,to}=cellRange(line,column),raw=line.slice(from,to),leading=/^[ \t]*/.exec(raw)[0],value=raw.slice(leading.length).replace(marker,'');
 return line.slice(0,from)+leading+(color?'{bg:'+color+'} ':'')+value+line.slice(to);
}
module.exports={colors,cellColor,colorMarkdown,cellRange,setCellColor};
