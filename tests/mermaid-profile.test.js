const test=require('node:test'),assert=require('node:assert/strict');
const {githubDefaults,createRenderer,installMermaid}=require('../src/js/vendor/mermaid-profile');
test('GitHub defaults match ELK, wrapping and fonts without weakening security or mutating callers',()=>{
 const source={securityLevel:'strict',maxTextSize:50000,theme:'dark',themeVariables:{primaryColor:'#abc'},flowchart:{defaultRenderer:'dagre-wrapper',curve:'basis'}},before=JSON.stringify(source),out=githubDefaults(source);
 assert.equal(out.layout,'elk');assert.equal(out.startOnLoad,false);assert.equal(out.flowchart.wrappingWidth,120);assert.equal(out.flowchart.minNodeWidth,120);assert.equal(out.flowchart.diagramPadding,48);assert.equal(out.flowchart.useMaxWidth,true);assert.equal(out.flowchart.defaultRenderer,undefined);assert.equal(out.securityLevel,'strict');assert.equal(out.theme,'dark');assert.equal(out.themeVariables.primaryColor,undefined);assert.equal(out.maxTextSize,50000);assert.match(out.fontFamily,/trebuchet/);assert.equal(JSON.stringify(source),before);
});
test('engine replacement delegates through cached native references and restores on unload',()=>{
 const calls=[],config={securityLevel:'strict'},native={initialize:value=>calls.push(['old',value]),render:()=>11,mermaidAPI:{getSiteConfig:()=>config}},old=native.render,engine={initialize:value=>calls.push(['new',value]),render:()=>12,mermaidAPI:{getSiteConfig:()=>({})},newAPI:true};
 const restore=installMermaid(native,engine);assert.equal(native.render(),12);assert.equal(calls[0][0],'new');assert.equal(calls[0][1].layout,'elk');native.initialize({theme:'base'});assert.equal(calls.at(-1)[1].theme,'base');restore();assert.equal(native.render,old);assert.equal(native.render(),11);assert.equal(native.newAPI,undefined);assert.equal(calls.at(-1)[0],'old');
});

test('isolated renderer never inherits article CSS and removes its frame on failure or disposal',()=>{
 let removed=0,compiled='',appended=0;const engine={initialize(){},render(){},mermaidAPI:{render(){}}};const frame={style:{},setAttribute(){},contentDocument:{body:{style:{}}},contentWindow:{Function:source=>{compiled=source;return ()=>engine;}},remove:()=>removed++},doc={createElement:()=>frame,body:{appendChild:()=>appended++}};
 const source='/* pinned code */globalThis["mermaid"] = globalThis.__esbuild_esm_mermaid_nm["mermaid"].default;',renderer=createRenderer(source,doc);assert.equal(renderer.engine,engine);assert.match(frame.contentDocument.body.style.cssText,/line-height:normal/);assert.doesNotMatch(compiled,/globalThis\["mermaid"\] =/);renderer.dispose();assert.equal(removed,1);assert.equal(appended,1);
 assert.throws(()=>createRenderer('invalid',doc),/export changed/);assert.equal(appended,1);frame.contentWindow.Function=()=>{throw new Error('failed');};assert.throws(()=>createRenderer(source,doc),/failed/);assert.equal(removed,2);
});
test('native article containers cannot leak into diagram measurement and failed initialization restores the engine',()=>{
 const config={securityLevel:'strict'},original=()=>11,native={initialize(){},render:original,mermaidAPI:{getSiteConfig:()=>config}},args=[],engine={initialize(){},render:(...values)=>{args.push(values);return 12;},mermaidAPI:{render:(...values)=>{args.push(values);return 12;}}};
 const restore=installMermaid(native,engine);native.render('id','source',{article:true});native.mermaidAPI.render('id2','source2',{article:true});assert.deepEqual(args,[['id','source'],['id2','source2']]);restore();assert.equal(native.render,original);
 assert.throws(()=>installMermaid(native,{...engine,initialize(){throw new Error('broken');}}),/broken/);assert.equal(native.render,original);
});

test('the browser uses the same isolated renderer and GitHub defaults as Obsidian',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),context={};vm.runInNewContext(fs.readFileSync(require.resolve('../src/js/vendor/mermaid-profile'),'utf8'),context);
 assert.equal(typeof context.blogMermaid.createRenderer,'function');assert.equal(context.blogMermaid.installMermaid,undefined);assert.equal(JSON.stringify(context.blogMermaid.githubDefaults({theme:'dark',securityLevel:'strict'})),JSON.stringify(githubDefaults({theme:'dark',securityLevel:'strict'})));
});

test('authored light fills and dark text adapt with minimum contrast while preserving transparency',()=>{
 const {darkFill,foreground,luminance,rgb}=require('../src/js/vendor/mermaid-profile');
 for(const fill of [[255,255,255],[241,245,249],[255,249,196],[227,242,253],[0,0,0]]){
  const result=darkFill(fill);assert.ok(luminance(result)<=.080001);
  for(const [color,ratio]of [[[15,23,42],4.5],[[100,116,139],3],[[255,255,255],4.5]]){
   const text=foreground(color,ratio);assert.ok((luminance(text)+.05)/(.08+.05)>=ratio);
  }
 }
 assert.deepEqual(darkFill([20,20,20,0.3]),[20,20,20,0.3]);
 assert.equal(rgb('transparent'),null);assert.equal(rgb('rgba(0, 0, 0, 0)'),null);assert.deepEqual(rgb('rgb(255, 249, 196)'),[255,249,196]);
});
test('theme correction follows host initialization, preserves bind functions and leaves light output unchanged',async()=>{
 const {adaptEngine}=require('../src/js/vendor/mermaid-profile'),calls=[],bind=()=>{},removed=[];
 const svg={style:{setProperty(){}},querySelectorAll:()=>[],outerHTML:'adapted SVG'};
 const doc={createElement:()=>({querySelector:()=>svg,remove:()=>removed.push(true)}),body:{appendChild(){}}};
 const engine={initialize:options=>calls.push(options),render:async(id,source)=>({svg:'original SVG',id,source,bindFunctions:bind}),mermaidAPI:{render:async()=>({svg:'original SVG'})}};
 adaptEngine(engine,doc);engine.initialize({theme:'dark'});
 const source='---\nconfig:\n  theme: base\n---\ngraph TD; A-->B',result=await engine.render('id',source);
 assert.equal(result.source,source);assert.equal(result.svg,'adapted SVG');assert.equal(result.bindFunctions,bind);assert.equal(calls[0].theme,'dark');assert.equal(removed.length,1);
 assert.equal((await engine.mermaidAPI.render('id',source)).svg,'adapted SVG');assert.equal(removed.length,2);
 engine.initialize({theme:'default'});assert.equal((await engine.render('day',source)).svg,'original SVG');assert.equal(removed.length,2);
});
