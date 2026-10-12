const fs=require("node:fs"),path=require("node:path");
function validateContent(content) {
 if(content.unresolved.length)throw new Error("Unresolved content references:\n"+content.unresolved.join("\n"));
 const pages=new Map(content.posts.map(p=>[p.url,new Set([...p.html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))]));pages.set("/",new Set(["who-and-why","recent","by-category"]));
 const assets=new Set(content.assets.values()),errors=[];
 for(const p of content.posts)for(const m of p.html.matchAll(/\b(href|src)="([^"]+)"/g)) {
  const raw=m[2].replaceAll("&amp;","&");if(!raw.startsWith("/")&&!raw.startsWith("#"))continue;
  const url=new URL(raw,"https://blog.anyflow.net"+p.url),pathname=url.pathname;
  if(pathname.startsWith("/assets/")){if(!assets.has(pathname))errors.push(p.url+" -> "+raw);continue;}
  const ids=pages.get(pathname);if(!ids){errors.push(p.url+" -> "+raw);continue;}
  if(url.hash&&!ids.has(decodeURIComponent(url.hash.slice(1))))errors.push(p.url+" -> missing anchor "+raw);
 }
 if(errors.length)throw new Error("Invalid generated links:\n"+errors.join("\n"));
}
module.exports={validateContent};

