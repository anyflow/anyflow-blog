const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),nunjucks=require('nunjucks');
const {loadContent}=require('../lib/content'),{validateContent}=require('../lib/validate-content');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-categories-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'_categories'));fs.mkdirSync(path.join(root,'_assets'));
 fs.writeFileSync(path.join(root,'_assets/category.svg'),'<svg xmlns="http://www.w3.org/2000/svg"></svg>');
 fs.writeFileSync(path.join(root,'index.md'),'---\ntitle: Home\npublish: true\n---\n\n## By Category\n\n<!-- blog:categories -->');
 fs.writeFileSync(path.join(root,'_categories/test.md'),'---\ntitle: Test\npublish: true\ncover: _assets/category.svg\nicon: 🎨\n---\n\n## Recent Posts\n\n<!-- blog:recent -->\n\n## Older Posts\n\n<!-- blog:older -->');
 for(let i=1;i<=13;i++)fs.writeFileSync(path.join(root,`post${i}.md`),`---\ntitle: Post ${i}\npublish: true\ncreated: 2026-01-${String(i).padStart(2,'0')}\ncategory: Test\n---\n\nBody.`);
 fs.writeFileSync(path.join(root,'other.md'),'---\ntitle: Other\npublish: true\ncreated: 2026-02-01\ncategory: Other\n---\n\nBody.');return root;
}
function environment(root){
 const env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve('src/_includes'))),data={},before=process.env.BLOG_CONTENT_DIR;process.env.BLOG_CONTENT_DIR=root;
 try{require('../.eleventy.js')({addFilter:(name,fn)=>env.addFilter(name,fn),addGlobalData:(name,value)=>data[name]=value,addPassthroughCopy(){}});}finally{if(before===undefined)delete process.env.BLOG_CONTENT_DIR;else process.env.BLOG_CONTENT_DIR=before;}
 return {env,data};
}
test('category pages are distinct from posts and partition their category into 10 recent cards and older posts',t=>{
 const root=fixture(t),content=loadContent(root);validateContent(content);const [page]=content.categoryPages;
 assert.equal(page.url,'/category/test');assert.equal(page.title,'Test');assert.equal(page.cover,'/assets/_assets/category.svg');assert.equal(page.icon,'🎨');assert.equal(page.noindex,undefined);
 assert.equal(content.posts.length,14);assert.equal(page.recent.length,10);assert.equal(page.older.length,3);assert.equal(page.recent[0].title,'Post 13');assert.equal(page.older[0].title,'Post 3');assert.equal(new Set([...page.recent,...page.older].map(p=>p.url)).size,13);assert.equal(page.posts.some(p=>p.category!=='Test'),false);
 assert.deepEqual(page.toc.map(t=>t.text),['Recent Posts','Older Posts']);assert.equal(content.home.id,'/');
 const catalog=require('../lib/comments/import').postCatalog(root);assert(catalog.posts.some(p=>p.id==='/'));assert(!catalog.posts.some(p=>p.permalink.startsWith('/category/')));
});
test('category HTML has cover, icon, linked entry points, two sections, no properties, no comments and no noindex',t=>{
 const root=fixture(t),{env,data}=environment(root),page=data.categoryPages[0],context={...data,site:require('../src/_data/site.json'),categoryPage:page};
 const body=env.renderString(fs.readFileSync('src/_includes/category.njk','utf8').replace(/^---[\s\S]*?---\n/,''),context),html=env.render('base.njk',{...context,content:body});
 assert.match(html,/<title>Test<\/title>/);assert.match(html,/class="page-cover"/);assert.match(html,/class="page-icon"/);assert.match(html,/href="https:\/\/www.anyflow.net\/category\/test"/);
 assert.match(html,/<span class="category-crumb" title="Test" aria-current="page">[\s\S]*?<span class="visual-icon-text">🎨<\/span>[\s\S]*?<span>Test<\/span><\/span>/);
 assert.equal((body.match(/class="card"/g)||[]).length,10);assert.equal((body.match(/class="category-row"/g)||[]).length,3);assert.doesNotMatch(body,/data-load-more="recent-cards"/);
 assert.doesNotMatch(html,/class="properties"|id="comments"|\/js\/comments.js|name="robots" content="noindex"/);
 const article=env.render('base.njk',{...data,site:context.site,post:data.posts.find(p=>p.category==='Test'),content:''});assert.match(article,/<a class="category-crumb" href="\/category\/test"/);assert.match(article,/<a class="category-crumb"[^>]*>[\s\S]*?<span class="visual-icon-text">🎨<\/span>[\s\S]*?<span>Test<\/span><\/a>/);
 assert.match(article,/<a class="site-logo" href="\/"/);
 assert.match(article,/<span class="post-crumb" aria-current="page">/);assert.doesNotMatch(article,/<a class="post-crumb"/);
 assert.doesNotMatch(html,/<a class="category-crumb"/);
 const home=env.render('base.njk',{...data,site:context.site,content:''});assert.match(home,/<span class="site-logo" aria-current="page">/);assert.doesNotMatch(home,/<a class="site-logo"/);

 const categories=env.renderString('{% from "icon.njk" import icon %}{% include "home-categories.njk" %}',context);assert.match(categories,/<a class="category-label" href="\/category\/test">Test<\/a>/);assert.match(categories,/<h3 class="category-heading">[\s\S]*?<span class="visual-icon-text">🎨<\/span>/);
 page.iconImage="/assets/category.svg";page.iconIsImage=true;const imageHtml=env.render("base.njk",{...context,content:""});assert.match(imageHtml,/<span class="category-crumb"[^>]*>[\s\S]*?<img class="visual-icon" src="\/assets\/category.svg"/);
 const sitemap=env.renderString(fs.readFileSync('src/sitemap.njk','utf8').replace(/^---[\s\S]*?---\n/,''),context);assert.match(sitemap,/<loc>https:\/\/www.anyflow.net\/category\/test<\/loc>/);
 assert.doesNotMatch(data.rss,/<link>https:\/\/www.anyflow.net\/category\/test<\/link>/);
});
test('hidden notes remain private while the exact root and direct category Markdown are recognized',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'_private.md'),'---\ntitle: Private\npublish: true\n---\n');
 const content=loadContent(root);assert.equal(content.posts.length,14);assert.equal(content.categoryPages.length,1);assert.equal(require('../lib/content-layout').noteUrl('index.md'),'/');assert.equal(require('../lib/content-layout').noteUrl('_categories/test.md'),'/category/test');assert.equal(require('../lib/content-layout').noteUrl('blog.md'),'/blog');assert.throws(()=>require('../lib/content-layout').noteUrl('_categories/bad name.md'),/Invalid note path/);
 fs.writeFileSync(path.join(root,'_categories/duplicate.md'),'---\ntitle: Test\npublish: true\n---\n');assert.throws(()=>loadContent(root),/Duplicate category/);
});
