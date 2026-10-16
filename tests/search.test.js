const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const nunjucks=require("nunjucks"),{buildSearchIndex}=require("../lib/search-index");
test("search indexes only supplied public pages and keeps an existing index when a page is missing",async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"blog-search-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,"index.html"),'<html lang="ko"><body><h1>Home navigation</h1></body></html>');
 for(const name of ["one","two"]){fs.mkdirSync(path.join(root,name));fs.writeFileSync(path.join(root,name,"index.html"),'<html lang="ko"><head><meta data-pagefind-filter="tag[content]" content="정확한, 태그"></head><body><h1>'+name+'</h1><article data-pagefind-body>한글 본문과 Kubernetes</article></body></html>');}
 fs.writeFileSync(path.join(root,"private.md"),"DO_NOT_INDEX");
 fs.writeFileSync(path.join(root,"private.html"),'<html lang="ko"><body data-pagefind-body>DO_NOT_INDEX</body></html>');
 const posts=[{url:"/one/"},{url:"/two/"}];assert.equal(await buildSearchIndex(root,posts),2);
 const output=path.join(root,"pagefind");assert.ok(fs.existsSync(path.join(output,"pagefind.js")));assert.ok(fs.existsSync(path.join(output,"LICENSE")));
 const entry=fs.readFileSync(path.join(output,"pagefind-entry.json"));assert.ok(JSON.parse(entry).languages.ko);
 await assert.rejects(buildSearchIndex(root,[...posts,{url:"/missing/"}]),/ENOENT/);
 assert.deepEqual(fs.readFileSync(path.join(output,"pagefind-entry.json")),entry);
});
test("home and post share one search dialog; card tags are buttons outside the post link",()=>{
 const env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve(__dirname,"../src/_includes")));
 env.addFilter("versionedAsset",s=>s);env.addFilter("tagColor",()=>"#fff");env.addFilter("tagStyle",()=>"");env.addFilter("dateLabel",s=>s);
 env.addFilter('absoluteUrl',url=>new URL(url,require('../src/_data/site.json').url).href);
 const item={title:"Title",url:"/one/",tags:['정확한, 태그','A&B','Istio','Service-Mesh',' service--mesh '],category:"Category",tagStyles:{},toc:[],displayDate:"2025/01/01",date:"2025-01-01"};
 const noindex=env.render("base.njk",{site:{title:"Blog"},home:{},post:{...item,noindex:true},content:""});assert.match(noindex,/<meta name="robots" content="noindex">/);
 for(const post of [null,item]){
  const html=env.render("base.njk",{site:{title:"Blog"},home:{},post,content:""});
  assert.equal((html.match(/class="search-button"/g)||[]).length,1);assert.equal((html.match(/<dialog /g)||[]).length,1);
  assert.match(html,/aria-labelledby="search-title"/);
  if(post){assert.match(html,/data-pagefind-filter="tag\[content\]" content="정확한, 태그"/);assert.match(html,/data-search-tag="A&amp;B"/);assert.match(html,/data-pagefind-filter="tag\[content\]" content="istio"/);assert.doesNotMatch(html,/data-pagefind-filter="tag\[content\]" content="Istio"/);assert.match(html,/data-search-tag="Istio"/);assert.match(html,/>Istio<\/button>/);assert.equal((html.match(/data-pagefind-filter="tag\[content\]" content="service mesh"/g)||[]).length,2);assert.match(html,/data-search-tag="Service-Mesh" aria-label="Service Mesh 태그로 검색"/);assert.match(html,/>Service Mesh<\/button>/);assert.doesNotMatch(html,/>Service-Mesh<\/button>/);}
 }
 const home=env.renderString(require("gray-matter")(fs.readFileSync(path.resolve(__dirname,"../src/index.njk"),"utf8")).content,{posts:[item],categories:[],home:{sections:[{className:'recent',parts:[{kind:'recent'}]}]}});
 assert.doesNotMatch(home,/Recent 검색|카테고리 검색|gallery-tools|<a\b[^>]*class="card"/);
 assert.match(home,/<article class="card"/);assert.match(home,/<a class="card-link" href="\/one\/">/);
 assert.match(home,/<\/a><\/h3>[\s\S]*<button[^>]*data-search-tag="정확한, 태그"/);
});
