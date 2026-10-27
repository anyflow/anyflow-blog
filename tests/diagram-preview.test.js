const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('card diagrams use 60% scale and keep node focus; article diagrams keep responsive sizing',async()=>{
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
 assert.equal(card.drawing.style.width,'576px');assert.equal(card.drawing.style.height,'840px');
 assert.deepEqual(article.drawing.style,{});assert.equal(card.drawing.style.transform,'translate(-172.5px, 0px)');assert.equal(card.dataset.processed,'true');assert.equal(later.dataset.processed,undefined);
 later.hidden=false;later.drawing.querySelectorAll=()=>[];context.root.dataset.theme='dark';context.drawGraphs();await context.graphDraw;
 assert.equal(later.drawing.style.width,'576px');assert.equal(later.drawing.style.height,'840px');
 assert.deepEqual(article.drawing.style,{});assert.equal(later.drawing.style.transform,undefined);assert.deepEqual(themes,['default','dark']);
 assert.deepEqual(rendered,['diagram-0','diagram-1','diagram-0','diagram-1','diagram-2']);
});

test('failed diagram rendering never exposes raw source and can recover on the next draw',async()=>{
 const source=fs.readFileSync('src/js/main.js','utf8'),start=source.indexOf('function drawGraphs()'),end=source.indexOf('\nif(graphSources.length)',start),raw='graph TD; Secret-->Source;';let fail=true;
 const node={dataset:{},textContent:raw,closest:()=>null,removeAttribute(){delete this.dataset.processed;}};
 const context={root:{dataset:{theme:'light'}},blogMermaid:{githubDefaults:x=>x},graphDraw:Promise.resolve(),graphSources:[{node,source:raw}],graphRenderer:{engine:{initialize(){},render:async()=>{if(fail)throw Error('bad diagram');return {svg:'<svg></svg>'};}}}};
 vm.runInNewContext(source.slice(start,end),context);context.drawGraphs();await context.graphDraw;assert.equal(node.dataset.renderError,'true');assert(!node.textContent.includes(raw));
 fail=false;context.drawGraphs();await context.graphDraw;assert.equal(node.dataset.processed,'true');assert.equal(node.dataset.renderError,undefined);assert.equal(node.innerHTML,'<svg></svg>');
});
test('library failure shows a message instead of hidden code; initial hiding covers article and card diagrams',async()=>{
 const source=fs.readFileSync('src/js/main.js','utf8'),css=fs.readFileSync('src/css/style.css','utf8'),nodes=[{dataset:{},textContent:'graph TD; A-->B;'}];
 const context={graphSources:nodes.map(node=>({node})),graphScript:{dataset:{mermaidSrc:'/mermaid.js'}},fetch:async()=>{throw Error('offline');},notify(){}};
 await vm.runInNewContext(source.slice(source.indexOf('if(graphSources.length)')),context);assert.equal(nodes[0].dataset.renderError,'true');assert.equal(nodes[0].textContent,'다이어그램을 불러오지 못했습니다.');
 assert.match(css,/\.mermaid:not\(\[data-processed=true\]\):not\(\[data-render-error\]\)\s*\{\s*visibility:hidden/);
 assert.doesNotMatch(css,/\.diagram-preview \.mermaid:not\(\[data-processed=true\]\)/);
});
