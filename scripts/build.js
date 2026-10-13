const fs=require("node:fs"),path=require("node:path");
const Eleventy=require("@11ty/eleventy").default;
const {loadContent}=require("../lib/content");
(async()=> {
  const target=process.env.BLOG_OUTPUT_DIR||"_site";
  if(!["_site","_preview"].includes(target)) throw new Error("Build output must be _site or _preview");
  const output=path.resolve(target);
  const staging=path.resolve(".cache/build-"+Date.now());
  const content=loadContent();
  require("../lib/validate-content").validateContent(content);
  if(!content.posts.length) throw new Error("Build requires at least one published post");
  await require("../lib/x-cache").cacheXThumbnails(content.xPosts);
  process.env.BLOG_OUTPUT_DIR=staging;
  const engine=new Eleventy("src",staging);
  await engine.write();
  if(!fs.existsSync(path.join(staging,"index.html"))) throw new Error("Build did not produce a home page in staging");
  for(const [source,url] of content.assets) {
    const destination=path.join(staging,decodeURIComponent(url));
    fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);
  }
  fs.mkdirSync(path.join(staging,"comments"),{recursive:true});
  fs.writeFileSync(path.join(staging,"comments/catalog.json"),JSON.stringify([...content.posts.map(({id,title,url,aliases})=>({id,title,url,aliases})),{id:content.home?.id||"home",title:content.home?.title||require("../src/_data/site.json").title,url:"/",aliases:content.home?.aliases||["/"]}]));
  await require("../lib/search-index").buildSearchIndex(staging,content.posts);
  if(fs.existsSync(output)) {
    const previous=path.resolve(".cache/previous-build");
    if(fs.existsSync(previous)) fs.rmSync(previous,{recursive:true});
    fs.renameSync(output,previous);
  }
  fs.renameSync(staging,output);
  console.log(`Published build: ${content.posts.length} posts, ${content.assets.size} referenced assets; ${content.unresolved.length} legacy unresolved references.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
