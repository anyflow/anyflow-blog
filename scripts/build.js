const fs=require("node:fs"),path=require("node:path");
const Eleventy=require("@11ty/eleventy").default;
const {loadContent}=require("../lib/content");
(async()=> {
  const target=process.env.BLOG_OUTPUT_DIR||"_site";
  if(!["_site","_preview"].includes(target)) throw new Error("Build output must be _site or _preview");
  const output=path.resolve(target);
  const staging=path.resolve(".cache/build-"+Date.now());
  let content=loadContent();
  require("../lib/validate-content").validateContent(content);
  if(!content.posts.length) throw new Error("Build requires at least one published post");
  if(!content.home) throw new Error("Build requires a published _root.md home page");
  await require("../lib/x-cache").cacheXThumbnails(content.xPosts);
  await require("../lib/link-cache").cacheLinks(content.linkRequests,process.env.BLOG_CONTENT_DIR||".cache/blog");
  content=loadContent();
  const cardImages=await require("../lib/card-images").buildCardImages(content,staging);
  process.env.BLOG_OUTPUT_DIR=staging;
  const engine=new Eleventy("src",staging);
  await engine.write();
  for(const url of Object.values(cardImages))if(!fs.existsSync(path.join(staging,url)))throw new Error("Missing generated card image: "+url);
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
