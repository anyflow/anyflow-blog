const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../integrations/obsidian-blog-links');
const sources={'./visual-gallery':fs.readFileSync(path.join(root,'visual-gallery.js'),'utf8'),'./mermaid-profile':fs.readFileSync(path.join(root,'mermaid-profile.js'),'utf8')};
const mermaid=fs.readFileSync(path.join(root,'vendor/mermaid-12.1.0.min.js'),'utf8'),globalExport='globalThis["mermaid"] = globalThis.__esbuild_esm_mermaid_nm["mermaid"].default;';
if(!mermaid.includes(globalExport))throw new Error('Mermaid browser export changed');
sources['./mermaid-source']='module.exports='+JSON.stringify(mermaid)+';';for(const name of ['bookmark','youtube','link-preview'])sources['./'+name]=fs.readFileSync(path.join(__dirname,'../lib/'+name+'.js'),'utf8');
sources['markdown-it']=fs.readFileSync(path.join(__dirname,'../integrations/obsidian-blog-links/vendor/markdown-it.min.js'),'utf8');
const modules=Object.entries(sources).map(([name,code])=>JSON.stringify(name)+':(module,exports,require)=>{\n'+code+'\n}').join(',\n');
const runtime='const modules={'+modules+'};const cache={};function bundledRequire(name){if(!modules[name])return require(name);if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;modules[name](module,module.exports,bundledRequire);return module.exports;}\n';
fs.writeFileSync(path.join(root,'main.js'),runtime+fs.readFileSync(path.join(root,'plugin.js'),'utf8').replaceAll("require('./mermaid-profile')","bundledRequire('./mermaid-profile')").replaceAll("require('./vendor/mermaid-12.1.0.min.js')","bundledRequire('./mermaid-source')").replaceAll("require('./visual-gallery')","bundledRequire('./visual-gallery')").replaceAll("require('./bookmark')","bundledRequire('./bookmark')").replaceAll("require('./link-preview')","bundledRequire('./link-preview')"));
const css=fs.readFileSync(path.join(__dirname,'../src/css/style.css'),'utf8');
const base=css.slice(css.indexOf('/* Compact Notion bookmarks'),css.indexOf('@media(min-width:601px)',css.indexOf('/* Compact Notion bookmarks')));
fs.writeFileSync(path.join(root,'styles.css'),base.replaceAll('[data-theme=dark]','.theme-dark')+'\n'+fs.readFileSync(path.join(__dirname,'../src/css/link-previews.css'),'utf8')+'\n.blog-links .bookmark{display:flex;overflow:hidden}.blog-links .bookmark-content{display:flex;flex-direction:column}.blog-links .bookmark-main{display:flex;flex-direction:column}.blog-links .bookmark-media{position:relative;overflow:hidden}.blog-links .bookmark-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;margin:0}.blog-links .bookmark{color:var(--text);border-color:var(--faint)}');

fs.copyFileSync(path.join(__dirname,'../integrations/obsidian-blog-links/vendor/markdown-it.LICENSE'),path.join(root,'markdown-it.LICENSE'));

fs.appendFileSync(path.join(root,"styles.css"),"\n.blog-category-picker{flex-shrink:0;margin-left:4px;padding:4px;border:0;background:transparent;box-shadow:none}.blog-category-picker svg{width:16px;height:16px}\n");

fs.appendFileSync(path.join(root,"styles.css"),fs.readFileSync(path.join(root,"visual-gallery.css"),"utf8"));

fs.appendFileSync(path.join(root,'styles.css'),fs.readFileSync(path.join(root,'editor-parity.css'),'utf8'));

// Reuse public article rules so native Obsidian margins cannot override the blog.
for(const selector of ['.post-body h2 ','.post-body h3 ','.post-body h4 ','.post-body p ','.post-body ul,','.post-body li ','.post-body li>p ','.post-body li + li ','.post-body blockquote:not(.callout)>p ','.post-body blockquote:not(.callout)>p+p ']){
 const rule=css.split('\n').find(line=>line.startsWith(selector));if(!rule)throw new Error('Missing blog typography rule: '+selector);
 fs.appendFileSync(path.join(root,'styles.css'),'\n'+(/h[234]/.test(selector)?rule.replace(/margin:([^;}]+)/,'margin:$1!important'):rule).replaceAll('.post-body','.markdown-reading-view .markdown-preview-view.markdown-rendered'));
}

fs.copyFileSync(path.join(root,'vendor/mermaid.LICENSE'),path.join(root,'mermaid.LICENSE'));
