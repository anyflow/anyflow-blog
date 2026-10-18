const font='"trebuchet ms", verdana, arial, sans-serif';
const exportMarker='globalThis["mermaid"] = globalThis.__esbuild_esm_mermaid_nm["mermaid"].default;';
function githubDefaults(options={}){
 const site={};for(const key of ['theme','securityLevel','secure','maxTextSize','maxEdges','logLevel'])if(options[key]!==undefined)site[key]=options[key];
 // Old native defaults must not override the new engine; authored frontmatter is applied by render().
 return {...site,startOnLoad:false,layout:'elk',fontFamily:font,themeVariables:{fontFamily:font},flowchart:{useMaxWidth:true,wrappingWidth:120,minNodeWidth:120,diagramPadding:48}};
}

function rgb(value){
 const match=/^rgba?\(([^)]+)\)$/.exec(value||'');if(!match)return null;
 const parts=match[1].split(/[, /]+/).filter(Boolean).map(Number);
 return parts.length>=3&&parts.every(Number.isFinite)&&(parts[3]??1)>0?parts:null;
}
const linear=value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
const luminance=values=>values.slice(0,3).reduce((sum,value,i)=>sum+linear(value/255)*[.2126,.7152,.0722][i],0);
const css=values=>'rgba('+values.slice(0,3).map(Math.round).join(',')+','+(values[3]??1)+')';
function darkFill(values){
 if(luminance(values)<=.08)return values;
 const channels=values.slice(0,3).map(value=>value/255),max=Math.max(...channels),min=Math.min(...channels),delta=max-min,l=(max+min)/2;
 const saturation=delta?delta/(1-Math.abs(2*l-1)):0;
 let hue=delta?(max===channels[0]?(channels[1]-channels[2])/delta%6:max===channels[1]?(channels[2]-channels[0])/delta+2:(channels[0]-channels[1])/delta+4):0;
 hue=(hue+6)%6;const light=.18+.04*saturation,chroma=(1-Math.abs(2*light-1))*saturation,x=chroma*(1-Math.abs(hue%2-1)),m=light-chroma/2;
 const primaries=[[chroma,x,0],[x,chroma,0],[0,chroma,x],[0,x,chroma],[x,0,chroma],[chroma,0,x]][Math.floor(hue)];
 const result=primaries.map(value=>(value+m)*255);
 // Bound the brightest fills so one foreground contrast floor covers authored palettes.
 if(luminance(result)>.08){const ratio=.08/luminance(result);for(let i=0;i<3;i++){const v=linear(result[i]/255)*ratio;result[i]=255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);}}
 return [...result,values[3]??1];
}
function foreground(values,minimum){
 const opaque=values.slice(0,3);
 for(let step=0;step<=20;step++){
  const mixed=opaque.map(value=>value+(255-value)*step/20);
  if((luminance(mixed)+.05)/(.08+.05)>=minimum)return [...mixed,values[3]??1];
 }
 return [255,255,255,values[3]??1];
}
function adaptDarkSvg(source,doc){
 const host=doc.createElement('div');host.innerHTML=source;doc.body.appendChild(host);
 try{
  const svg=host.querySelector('svg');if(!svg)return source;
  // Read first, write second: avoid a style recalculation for every SVG element.
  const values=[...svg.querySelectorAll('rect,polygon,circle,ellipse,path,line,polyline,text,tspan,foreignObject *')].map(node=>{
   const style=doc.defaultView.getComputedStyle(node);
   return {node,fill:rgb(style.fill),stroke:rgb(style.stroke),color:rgb(style.color),background:rgb(style.backgroundColor)};
  });
  svg.style.setProperty('background-color','transparent','important');
  for(const {node,fill,stroke,color,background}of values){
   const text=['text','tspan'].includes(node.localName),html=node.namespaceURI!=='http://www.w3.org/2000/svg';
   const set=(name,value)=>node.style.setProperty(name,css(value),'important');
   if(fill&&!html)set('fill',text||node.closest('marker')?foreground(fill,text?4.5:3):darkFill(fill));
   if(stroke&&!text&&!html)set('stroke',foreground(stroke,3));
   if(color&&(text||html))set('color',foreground(color,4.5));
   if(background)set('background-color',darkFill(background));
  }
  return svg.outerHTML;
 }finally{host.remove();}
}
function adaptEngine(engine,doc){
 let dark=false;const initialize=engine.initialize.bind(engine);
 engine.initialize=options=>{dark=options?.theme==='dark';return initialize(options);};
 const wrap=render=>async(...args)=>{const result=await render(...args);return dark&&typeof result?.svg==='string'?{...result,svg:adaptDarkSvg(result.svg,doc)}:result;};
 engine.render=wrap(engine.render.bind(engine));
 engine.mermaidAPI={...engine.mermaidAPI,render:wrap(engine.mermaidAPI.render.bind(engine.mermaidAPI))};
 return engine;
}
function createRenderer(source,doc=document){
 if(!source.includes(exportMarker))throw new Error('Mermaid browser export changed');
 const frame=doc.createElement('iframe');frame.className='blog-mermaid-renderer';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:absolute;left:-10000px;width:1200px;height:1000px;visibility:hidden';doc.body.appendChild(frame);
 try{
  frame.contentDocument.body.style.cssText='font:16px Arial;line-height:normal;margin:0';
  // This pinned local library runs in its own CSS realm, like GitHub's renderer frame.
  const engine=frame.contentWindow.Function(source.replace(exportMarker,'')+';return __esbuild_esm_mermaid_nm.mermaid.default;')();
  return {engine:adaptEngine(engine,frame.contentDocument),dispose:()=>frame.remove()};
 }catch(error){frame.remove();throw error;}
}
function installMermaid(native,engine,getTheme){
 const previous=Object.getOwnPropertyDescriptors(native),config=native.mermaidAPI.getSiteConfig();let current=config;
 const restore=()=>{for(const key of Object.keys(native))if(!Object.hasOwn(previous,key))delete native[key];Object.defineProperties(native,previous);native.initialize(config);};
 try{
  Object.assign(native,engine);native.initialize=options=>{current=options;return engine.initialize(githubDefaults(options));};
  // Never let a native caller pass the article DOM into isolated text measurement.
  const render=(method,id,source)=>{if(getTheme)engine.initialize(githubDefaults({...current,theme:getTheme()}));return method(id,source);};
  native.render=(id,source)=>render(engine.render,id,source);native.mermaidAPI={...engine.mermaidAPI,initialize:native.initialize,render:(id,source)=>render(engine.mermaidAPI.render,id,source)};
  native.initialize(config);return restore;
 }catch(error){restore();throw error;}
}
if(typeof module!=='undefined')module.exports={githubDefaults,createRenderer,installMermaid,rgb,luminance,darkFill,foreground,adaptDarkSvg,adaptEngine};
else globalThis.blogMermaid={githubDefaults,createRenderer};
