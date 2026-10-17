const {loadContent} = require("./lib/content");
const fs=require("node:fs"),path=require("node:path"),{createHash}=require("node:crypto");
const site=require("./src/_data/site.json");
module.exports = function(config) {
  config.addFilter("absoluteUrl",url=>new URL(url,site.url).href);
  const sharedAssets={"/js/mermaid-profile.js":"integrations/obsidian-blog-links/mermaid-profile.js","/js/vendor/mermaid.min.js":"integrations/obsidian-blog-links/vendor/mermaid-12.1.0.min.js"};
  for(const [url,source] of Object.entries(sharedAssets))config.addPassthroughCopy({[source]:url.slice(1)});
  config.addFilter("versionedAsset",url=>`${url}?v=${createHash("sha256").update(fs.readFileSync(path.join(__dirname,sharedAssets[url]||path.join("src",url)))).digest("hex").slice(0,12)}`);
  const content=loadContent();
  config.addGlobalData("posts",content.posts);
  config.addGlobalData("home",{id:"home",...site,coverPosition:"50% 50%",...content.home});
  const order=new Map(site.categoryOrder.map((name,index)=>[name,index]));
  const names=[...new Set(content.posts.map(post=>post.category))].sort((a,b)=>(order.get(a)??Infinity)-(order.get(b)??Infinity)||a.localeCompare(b,"ko"));
  config.addGlobalData("categories",names.map(name=>({name,posts:content.posts.filter(p=>p.category===name)})));
  config.addFilter("tagColor",name=>{const palette=["#f1f0ef","#e7f3e6","#e3f2fb","#ffe8f3","#fef5e6","#f9eee2","#f6edfa","#ffe8e7"];return palette[Array.from(String(name)).reduce((n,c)=>n+c.codePointAt(0),0)%palette.length];});
  config.addFilter("tagStyle",bg=>{
    const themes={"#f1f0ef":["#32302c","rgba(71,76,80,.7)","rgba(255,255,255,.88)"],"#e7f3e6":["#1c3829","#344f40","#b5d2ac"],"#e3f2fb":["#183347","#2b4d67","#a3cbea"],"#ffe8f3":["#4c2337","#633856","#f8aacb"],"#fef5e6":["#402c1b","#66543b","#fad5a1"],"#f9eee2":["#442a1e","#5b4739","#f0c295"],"#ffe8e7":["#5d1715","#69363f","#feaca5"],"#f6edfa":["#412454","#574263","#dbb5ef"]};
    const [fg,darkBg,darkFg]=themes[bg]||themes["#f1f0ef"];
    return `--tag-bg:${bg};--tag-fg:${fg};--tag-dark-bg:${darkBg};--tag-dark-fg:${darkFg}`;
  });
  config.addFilter("dateLabel",date=>new Date(date).toISOString().slice(0,10).replaceAll("-","/"));
  config.addPassthroughCopy({"node_modules/katex/dist/katex.min.css":"vendor/katex/katex.min.css","node_modules/katex/dist/fonts":"vendor/katex/fonts","node_modules/katex/LICENSE":"vendor/katex/LICENSE"});
  config.addPassthroughCopy("src/css");config.addPassthroughCopy("src/js");config.addPassthroughCopy("src/images");
  return {dir:{input:"src",includes:"_includes",data:"_data",output:process.env.BLOG_OUTPUT_DIR||"_site"},templateFormats:["njk"],htmlTemplateEngine:"njk"};
};
