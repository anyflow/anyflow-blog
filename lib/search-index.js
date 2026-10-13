const fs=require("node:fs"),path=require("node:path");
async function buildSearchIndex(directory,posts) {
 const pagefind=await import("pagefind");
 try {
  const {index,errors}=await pagefind.createIndex({includeCharacters:"+#",excludeSelectors:[".copy-code",".code-language",".notion-empty-paragraph",".block-anchor"]});
  if(errors.length||!index)throw new Error("Search index initialization failed: "+errors.join("; "));
  for(const post of posts){
   const result=await index.addHTMLFile({url:post.url,content:fs.readFileSync(path.join(directory,post.url.slice(1),"index.html"),"utf8")});
   if(result.errors.length||!result.file)throw new Error("Search index failed for "+post.url+": "+result.errors.join("; "));
  }
  const output=path.join(directory,"pagefind"),written=await index.writeFiles({outputPath:output});
  if(written.errors.length)throw new Error("Search index output failed: "+written.errors.join("; "));
  fs.cpSync(path.join(__dirname,"../node_modules/pagefind/LICENSE"),path.join(output,"LICENSE"),{recursive:true});
  return posts.length;
 } finally {await pagefind.close();}
}
module.exports={buildSearchIndex};
