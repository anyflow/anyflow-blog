const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),nunjucks=require('nunjucks');
test('all tags use stable palette colors and category colors remain independent',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tag-colors-')),previous=process.env.BLOG_CONTENT_DIR;t.after(()=>{fs.rmSync(root,{recursive:true,force:true});if(previous===undefined)delete process.env.BLOG_CONTENT_DIR;else process.env.BLOG_CONTENT_DIR=previous;});process.env.BLOG_CONTENT_DIR=root;
 fs.writeFileSync(path.join(root,'one.md'),'---\ntitle: One\ncreated: 2026-01-01\ncategory: Test\npublish: true\n---\nBody.');
 const env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve('src/_includes'))),filters={};require('../.eleventy.js')({addFilter:(name,fn)=>{filters[name]=fn;env.addFilter(name,fn);},addGlobalData:()=>{},addPassthroughCopy:()=>{}});
 assert.equal(filters.tagColor('k8s'),'#f6edfa');assert.equal(filters.tagColor('k8s'),filters.tagColor('k8s'));
 assert.equal(new Set(Array.from('ABCDEFGH',name=>filters.tagColor(name))).size,8);assert.equal(filters.tagColor('프로젝트s',true),'#ebebec');assert.notEqual(filters.tagColor('프로젝트s'),filters.tagColor('프로젝트s',true));
 const html=env.renderString('{% from "tags.njk" import tag %}{{ tag("k8s",true) }}{{ tag("프로젝트s") }}');assert.match(html,/class="tag tag-filter" style="--tag-bg:#f6edfa;/);assert.match(html,/class="tag" style="--tag-bg:#ebebec;/);assert.match(html,/--tag-dark-bg:/);assert.match(html,/--tag-dark-fg:/);
});
