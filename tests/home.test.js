const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),nunjucks=require('nunjucks');
const {loadContent}=require('../lib/content'),{validateContent}=require('../lib/validate-content');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-home-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'target'));fs.writeFileSync(path.join(root,'target.md'),'---\ntitle: Target\npost_id: target123\npermalink: /target\npublish: true\ncreated: 2026-01-01\ncategory: Test\n---\n\nA post.');return root;}
const header='---\ntitle: Authored home\npost_id: root12345\nsummary: Authored summary\npermalink: /\npublish: true\n---\n\n';
function render(content,categories=[]){const env=new nunjucks.Environment(new nunjucks.FileSystemLoader([path.resolve('src'),path.resolve('src/_includes')]));for(const [name,fn]of Object.entries({absoluteUrl:url=>new URL(url,'https://www.anyflow.net').href,versionedAsset:url=>url,tagColor:()=>'',tagStyle:()=>''}))env.addFilter(name,fn);const data={...content,site:{title:'Fallback title',description:'Fallback description'},categories};return env.render('base.njk',{...data,content:env.render('index.njk',data)});}
test('root Markdown owns title, introduction, contacts, section labels, order and TOC',t=>{
 const root=fixture(t),file=path.join(root,'index.md');fs.writeFileSync(file,header+'## Intro authored\n\nHello **reader**.\n\n- [Contact](https://example.com/contact)\n\n[My bookmark](https://www.anyflow.net/target)\n\n## Fresh writing\n\nBefore cards.\n\n<!-- blog:recent -->\n\nAfter cards.\n\n## Grouped writing\n\n<!-- blog:categories -->');
 let content=loadContent(root);validateContent(content);let html=render(content);
 assert.equal(content.home.id,'/');assert.ok(require('../lib/comments/import').postCatalog(root).posts.some(p=>p.permalink==='/'&&p.id==='/'));assert.deepEqual(content.home.toc.map(x=>[x.id,x.text]),[['who-and-why','Intro authored'],['recent','Fresh writing'],['by-category','Grouped writing']]);
 assert.match(html,/<title>Authored home<\/title>/);assert.match(html,/og:description" content="Authored summary"/);assert.match(html,/Hello <strong>reader<\/strong>/);assert.match(html,/class="profile-columns"/);assert.match(html,/>Target<\/span>/);assert.doesNotMatch(html,/>My bookmark<\/span>/);assert.match(html,/href="https:\/\/example.com\/contact"/);assert.match(html,/id="recent">Fresh writing/);assert.ok(html.indexOf('Before cards.')<html.indexOf('id="recent-cards"')&&html.indexOf('After cards.')>html.indexOf('id="recent-cards"'));assert.doesNotMatch(html,/Who and Why|Recent Posts|By Category|blog:recent|blog:categories/);
 const target=path.join(root,'target.md');fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('title: Target','title: Updated target'));assert.match(render(loadContent(root)),/>Updated target<\/span>/);
 fs.writeFileSync(file,header+'## Categories first\n\n<!-- blog:categories -->\n\n## Latest notes\n\n<!-- blog:recent -->\n\n## Extra\n\nAdditional text.');content=loadContent(root);html=render(content);assert.ok(html.indexOf('Categories first')<html.indexOf('Latest notes'));assert.match(html,/href="#recent"[^>]*>Latest notes/);assert.match(html,/id="extra">Extra/);assert.match(html,/Additional text/);
});
test('home slots are explicit standalone comments and duplicate lists fail',t=>{
 const root=fixture(t),file=path.join(root,'index.md');fs.writeFileSync(file,header+'## Notes\n\n```md\n<!-- blog:recent -->\n```');let c=loadContent(root);assert.ok(c.home.sections.every(s=>s.parts.every(p=>p.kind==='html')));assert.equal(c.unresolved.length,0);
 fs.writeFileSync(file,header+'## One\n\n<!-- blog:recent -->\n\n## Two\n\n<!-- blog:recent -->');assert.throws(()=>loadContent(root),/Duplicate home list/);
});

test('home categories keep configured order and headings cannot collapse',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'index.md'),header+'## Categories\n\n<!-- blog:categories -->');
 const expected=['as 음악인','as Software Engineer','예술/인문 소감','自省(Introspection) / 세상살이','프로젝트s'];
 for(const [i,category]of [...expected].reverse().entries())fs.writeFileSync(path.join(root,`category-${i}.md`),`---\ntitle: Category ${i}\npublish: true\ncreated: 2026-01-01\ncategory: ${category}\n---\n\nBody.`);
 const previous=process.env.BLOG_CONTENT_DIR;process.env.BLOG_CONTENT_DIR=root;const globals={};
 try{require('../.eleventy.js')({addFilter(){},addGlobalData(name,value){globals[name]=value;},addPassthroughCopy(){}});}finally{if(previous===undefined)delete process.env.BLOG_CONTENT_DIR;else process.env.BLOG_CONTENT_DIR=previous;}
 assert.deepEqual(globals.categories.map(g=>g.name),[...expected,'Test']);
 const html=render(loadContent(root),globals.categories);
 assert.equal((html.match(/class="category-heading"/g)||[]).length,6);assert.doesNotMatch(html,/<details[^>]*category-group|<summary/);
 for(const name of expected)assert.ok(html.includes(name));
});

test('only the leading home caption overlays an existing cover, without duplication',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'cover.svg'),'<svg xmlns="http://www.w3.org/2000/svg"></svg>');
 const body='> [!caption] **Cover credit**\n\n## Intro\n\n> [!caption] Body caption.';
 fs.writeFileSync(path.join(root,'index.md'),header.replace('publish: true','publish: true\ncover: cover.svg')+body);
 let content=loadContent(root),html=render(content);assert.match(content.home.coverCaption,/<strong>Cover credit<\/strong>/);assert.match(html,/<div class="cover-caption">/);assert.equal((html.match(/Cover credit/g)||[]).length,1);assert.match(html,/Body caption/);
 fs.writeFileSync(path.join(root,'index.md'),header+body);content=loadContent(root);assert.equal(content.home.coverCaption,undefined);assert.match(render(content),/Cover credit/);
});
