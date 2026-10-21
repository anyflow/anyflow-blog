function parseLayout(line){
 const match=/^[ \t]*<!--\s*table-layout\s+([^<>]*?)\s*-->[ \t]*$/.exec(line||'');if(!match)return null;
 const layout={},attrs=match[1];
 for(const item of attrs.matchAll(/(widths|min-heights)="([^"]*)"/g)){
  if(layout[item[1]])return null;const values=item[2].split(',').map(v=>v.trim());
  if(!values.length||values.some(v=>v!=='auto'&&(!/^\d+$/.test(v)||Number(v)<24||Number(v)>4096)))return null;
  layout[item[1]]=values.map(v=>v==='auto'?v:Number(v));
 }
 if(!Object.keys(layout).length||attrs.replace(/(widths|min-heights)="[^"]*"/g,'').trim())return null;
 return layout;
}
function layoutBefore(lines,start){let index=start-1;while(index>=0&&!lines[index].trim())index--;const layout=parseLayout(lines[index]);return layout?{layout,index,text:lines[index]}:null;}
function tableWidth(widths,count){
 const values=Array.from({length:count},(_,i)=>widths[i]??'auto'),sum=values.reduce((n,v)=>n+(v==='auto'?80:v),0);
 return values.includes('auto')?'max(100%, '+sum+'px)':sum+'px';
}
function setDimension(source,start,axis,index,value,initial=[]){
 if(!['widths','min-heights'].includes(axis)||!Number.isInteger(index)||index<0||index>999||value!=='auto'&&(!Number.isInteger(value)||value<24||value>4096))throw new Error('표 크기 값을 확인하세요.');
 const lines=source.split('\n'),previous=layoutBefore(lines,start),layout=previous?{...previous.layout}:{};
 const values=[...(layout[axis]||initial)];while(values.length<=index)values.push('auto');values[index]=value;layout[axis]=values;
 for(const key of Object.keys(layout))if(layout[key].every(v=>v==='auto'))delete layout[key];
 const attrs=['widths','min-heights'].filter(k=>layout[k]).map(k=>k+'="'+layout[k].join(',')+'"').join(' '),indent=/^[ \t]*/.exec(lines[start]||'')[0];
 if(previous){if(attrs)lines[previous.index]=indent+'<!-- table-layout '+attrs+' -->';else lines.splice(previous.index,1);}
 else if(attrs)lines.splice(start,0,indent+'<!-- table-layout '+attrs+' -->','');
 return lines.join('\n');
}
function layoutMarkdown(md){
 md.core.ruler.after('inline','table_layout',state=>{
  const lines=state.src.split('\n');let layout=null,row=0,column=0,columns=0;
  for(let i=0;i<state.tokens.length;i++){
   const token=state.tokens[i];
   if(token.type==='table_open'){
    layout=layoutBefore(lines,token.map[0])?.layout;row=0;columns=0;if(!layout)continue;
    for(let j=i+1;j<state.tokens.length&&state.tokens[j].type!=='tr_close';j++)if(state.tokens[j].type==='th_open')columns++;
    token.meta={...token.meta,tableLayout:layout,columns};token.attrJoin('class','table-has-layout');
    if(layout.widths)token.attrJoin('style','table-layout:fixed;width:'+tableWidth(layout.widths,columns));
   }else if(token.type==='tr_open'&&layout){column=0;const height=layout['min-heights']?.[row++];if(typeof height==='number')token.attrJoin('style','height:'+height+'px');}
   else if(['th_open','td_open'].includes(token.type)&&layout){const width=layout.widths?.[column++];if(typeof width==='number')token.attrJoin('style','width:'+width+'px');}
   else if(token.type==='table_close'){token.meta={...token.meta,hasLayout:!!layout};layout=null;}
  }
 });
 const open=md.renderer.rules.table_open,close=md.renderer.rules.table_close;
 md.renderer.rules.table_open=(tokens,i,options,env,self)=>{const html=open?open(tokens,i,options,env,self):self.renderToken(tokens,i,options),meta=tokens[i].meta;if(!meta?.tableLayout)return html;const widths=meta.tableLayout.widths;return '<div class="table-layout-scroll">'+html+(widths?'<colgroup>'+Array.from({length:meta.columns},(_,c)=>'<col'+(typeof widths[c]==='number'?' style="width:'+widths[c]+'px"':'')+'>').join('')+'</colgroup>':'');};
 md.renderer.rules.table_close=(tokens,i,options,env,self)=>(close?close(tokens,i,options,env,self):self.renderToken(tokens,i,options))+(tokens[i].meta?.hasLayout?'</div>':'');
}
module.exports={parseLayout,layoutBefore,tableWidth,setDimension,layoutMarkdown};
