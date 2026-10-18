const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('card diagrams keep one CSS pixel per SVG unit; article diagrams keep responsive sizing',async()=>{
 const source=fs.readFileSync('src/js/main.js','utf8'),start=source.indexOf('function drawGraphs()'),end=source.indexOf('\nif(graphSources.length)',start),themes=[],rendered=[];
 function node(card,hidden=false){
  const drawing={viewBox:{baseVal:{width:960,height:1400}},style:{},querySelectorAll:()=>[{getBoundingClientRect:()=>({left:-150,top:-100,width:120,height:60})},{getBoundingClientRect:()=>({left:300,top:75,width:100,height:50})}]};
  return {drawing,hidden,dataset:{},getBoundingClientRect:()=>({left:0,top:0,width:355,height:200}),closest(selector){return selector==='[hidden]'?(this.hidden?{}:null):card?{}:null;},querySelector:()=>drawing,removeAttribute(name){delete this.dataset.processed;}};
 }
 const card=node(true),article=node(false),later=node(true,true);
 const context={root:{dataset:{theme:'light'}},blogMermaid:{githubDefaults:options=>options},graphDraw:Promise.resolve(),
  graphSources:[card,article,later].map((node,i)=>({node,source:'diagram-'+i})),
  graphRenderer:{engine:{initialize:options=>themes.push(options.theme),render:async(id,source)=>{rendered.push(source);return {svg:'<svg></svg>'};}}}};
 vm.runInNewContext(source.slice(start,end),context);context.drawGraphs();await context.graphDraw;
 assert.equal(card.drawing.style.width,'960px');assert.equal(card.drawing.style.height,'1400px');
 assert.deepEqual(article.drawing.style,{});assert.equal(card.drawing.style.transform,'translate(-172.5px, 0px)');assert.equal(card.dataset.processed,'true');assert.equal(later.dataset.processed,undefined);
 later.hidden=false;later.drawing.querySelectorAll=()=>[];context.root.dataset.theme='dark';context.drawGraphs();await context.graphDraw;
 assert.equal(later.drawing.style.width,'960px');assert.equal(later.drawing.style.height,'1400px');
 assert.deepEqual(article.drawing.style,{});assert.equal(later.drawing.style.transform,undefined);assert.deepEqual(themes,['default','dark']);
 assert.deepEqual(rendered,['diagram-0','diagram-1','diagram-0','diagram-1','diagram-2']);
});
