const font='"trebuchet ms", verdana, arial, sans-serif';
const exportMarker='globalThis["mermaid"] = globalThis.__esbuild_esm_mermaid_nm["mermaid"].default;';
function githubDefaults(options={}){
 const site={};for(const key of ['theme','securityLevel','secure','maxTextSize','maxEdges','logLevel'])if(options[key]!==undefined)site[key]=options[key];
 // Old native defaults must not override the new engine; authored frontmatter is applied by render().
 return {...site,startOnLoad:false,layout:'elk',fontFamily:font,themeVariables:{fontFamily:font},flowchart:{useMaxWidth:true,wrappingWidth:120,minNodeWidth:120,diagramPadding:48}};
}
function createRenderer(source,doc=document){
 if(!source.includes(exportMarker))throw new Error('Mermaid browser export changed');
 const frame=doc.createElement('iframe');frame.className='blog-mermaid-renderer';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:absolute;left:-10000px;width:1200px;height:1000px;visibility:hidden';doc.body.appendChild(frame);
 try{
  frame.contentDocument.body.style.cssText='font:16px Arial;line-height:normal;margin:0';
  // This pinned local library runs in its own CSS realm, like GitHub's renderer frame.
  const engine=frame.contentWindow.Function(source.replace(exportMarker,'')+';return __esbuild_esm_mermaid_nm.mermaid.default;')();
  return {engine,dispose:()=>frame.remove()};
 }catch(error){frame.remove();throw error;}
}
function installMermaid(native,engine){
 const previous=Object.getOwnPropertyDescriptors(native),config=native.mermaidAPI.getSiteConfig();
 const restore=()=>{for(const key of Object.keys(native))if(!Object.hasOwn(previous,key))delete native[key];Object.defineProperties(native,previous);native.initialize(config);};
 try{
  Object.assign(native,engine);native.initialize=options=>engine.initialize(githubDefaults(options));
  // Never let a native caller pass the article DOM into isolated text measurement.
  native.render=(id,source)=>engine.render(id,source);native.mermaidAPI={...engine.mermaidAPI,initialize:native.initialize,render:(id,source)=>engine.mermaidAPI.render(id,source)};
  native.initialize(config);return restore;
 }catch(error){restore();throw error;}
}
module.exports={githubDefaults,createRenderer,installMermaid};
