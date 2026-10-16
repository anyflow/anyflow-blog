const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const nunjucks=require('nunjucks'),matter=require('gray-matter');
test('sitemap rebuild follows publication, deletion, draft, noindex and permalink changes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-sitemap-')),previous=process.env.BLOG_CONTENT_DIR;
 t.after(()=>{if(previous===undefined)delete process.env.BLOG_CONTENT_DIR;else process.env.BLOG_CONTENT_DIR=previous;fs.rmSync(root,{recursive:true,force:true});});process.env.BLOG_CONTENT_DIR=root;
 const template=matter(fs.readFileSync(path.join(__dirname,'../src/sitemap.njk'),'utf8')).content;
 function write(name,extra={}){const data={title:name,permalink:'/'+name,created:'2026-01-01',category:'test',kind:'post',draft:false,...extra};fs.writeFileSync(path.join(root,name+'.md'),'---\n'+Object.entries(data).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\nBody');}
 function render(){const env=new nunjucks.Environment(),data={};require('../.eleventy.js')({addFilter:(name,fn)=>env.addFilter(name,fn),addGlobalData:(name,value)=>data[name]=value,addPassthroughCopy:()=>{}});return env.renderString(template,data);}
 const locs=xml=>[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 write('first');write('draft',{draft:true});write('hidden',{noindex:true});
 assert.deepEqual(locs(render()),['https://www.anyflow.net/','https://www.anyflow.net/first']);
 write('second');assert.ok(locs(render()).includes('https://www.anyflow.net/second'));
 fs.unlinkSync(path.join(root,'first.md'));assert.ok(!locs(render()).includes('https://www.anyflow.net/first'));
 write('second',{draft:true});assert.deepEqual(locs(render()),['https://www.anyflow.net/']);
 write('한글&a');fs.unlinkSync(path.join(root,'second.md'));assert.deepEqual(locs(render()),['https://www.anyflow.net/','https://www.anyflow.net/%ED%95%9C%EA%B8%80&amp;a']);
 write('한글&a',{noindex:true});assert.deepEqual(locs(render()),['https://www.anyflow.net/']);
});
