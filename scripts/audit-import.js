const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {loadContent}=require("../lib/content"),{validateContent}=require("../lib/validate-content");
const [root,referenceFile,imageMapFile,outputFile]=process.argv.slice(2);
const refs=JSON.parse(fs.readFileSync(referenceFile)),images=JSON.parse(fs.readFileSync(imageMapFile)),content=loadContent(root);
validateContent(content);
const counts={pages:content.posts.length,images:0,captions:0,callouts:0,toggles:0,quotes:0,tables:0,rows:0,headings:0,codes:0,equations:0,assets:content.assets.size,unresolved:content.unresolved.length},errors=[];
for(const p of content.posts) {
 const ref=refs[p.url.replace(/\/$/,"")];assert.ok(ref,"Missing source reference: "+p.url);
 const blocks=ref.blocks,expected=type=>blocks.filter(b=>b.type===type).length;
 const figures=[...p.html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g)].map(m=>m[1]),sourceImages=blocks.filter(b=>b.type==="image");
 if(figures.length!==sourceImages.length)errors.push(p.url+": image count "+figures.length+" != "+sourceImages.length);
 figures.forEach((figure,i)=>{
  const b=sourceImages[i],image=b&&images[b.id];if(!image)return;
  const src=/\bsrc="([^"]+)"/.exec(figure)?.[1],want="/assets/"+image.path.split("/").map(encodeURIComponent).join("/");
  if(src!==want)errors.push(p.url+": image identity mismatch "+b.id+" "+src);
  const hasCaption=/<figcaption>/.test(figure),wantCaption=Boolean(b.properties?.caption?.some(x=>x[0].trim()));
  if(hasCaption!==wantCaption)errors.push(p.url+": caption mismatch "+b.id);
 });
 const current={images:figures.length,captions:figures.filter(f=>/<figcaption>/.test(f)).length,callouts:(p.html.match(/<blockquote class="callout">/g)||[]).length,toggles:(p.html.match(/<details class="callout"/g)||[]).length,quotes:(p.html.match(/<blockquote>/g)||[]).length,tables:(p.html.match(/<table>/g)||[]).length,rows:(p.html.match(/<tr>/g)||[]).length,headings:(p.html.match(/<h[2-4]\b/g)||[]).length,codes:(p.html.match(/class="code-block"|class="mermaid"/g)||[]).length,equations:(p.html.match(/class="katex-display"/g)||[]).length};
 const metadata=blocks.filter(b=>b.type==="code"&&/(?:^|\n)cleanUrl:\s*\//.test((b.properties?.title||[]).map(x=>x[0]).join(""))).length;
 const wants={callouts:expected("callout"),toggles:expected("toggle"),quotes:expected("quote"),tables:expected("table"),rows:expected("table_row"),headings:expected("header")+expected("sub_header")+expected("sub_sub_header"),codes:expected("code")-metadata,equations:expected("equation")};
 for(const [key,want]of Object.entries(wants))if(current[key]!==want)errors.push(p.url+": "+key+" "+current[key]+" != "+want);
 for(const key of Object.keys(current))counts[key]+=current[key];
}
const report={counts,errors,checkedAt:new Date().toISOString()};
fs.writeFileSync(outputFile||".cache/import-audit.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;

