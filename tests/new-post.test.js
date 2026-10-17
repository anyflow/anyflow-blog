const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),yaml=require('js-yaml');
function load(){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.resolve('integrations/obsidian-blog-links/plugin.js'),'utf8'),{module,require:name=>name==='obsidian'?{Plugin:class{},Modal:class{},parseYaml:yaml.load,stringifyYaml:yaml.dump,moment:()=>({format:format=>format==='YYYY-MM-DD'?'2026-10-17':'08:30'})}:{}});return module.exports;}
test('new post paths reject traversal, reserved pages and nonpublic paths',()=>{
 const {newPostPath}=load();assert.equal(newPostPath('sw-engineer/new-post'),'sw-engineer/new-post.md');assert.equal(newPostPath('새글.md'),'새글.md');
 for(const value of ['', '/', 'blog.md','Blog','../escape','a/../b','a//b','_assets/one','.obsidian/one','a/space name','a?b','a%20b','a\\b'])assert.throws(()=>newPostPath(value),/파일 경로/);
});
test('creation needs no template, initializes current properties and never overwrites',async()=>{
 const Plugin=load(),p=new Plugin(),files=new Map(),created=[];let opened;
 p.app={vault:{getAbstractFileByPath:path=>files.get(path),createFolder:async path=>{created.push(path);files.set(path,{children:[]});},create:async(path,content)=>{assert.ok(!files.has(path));const file={path,content};files.set(path,file);return file;}},workspace:{getLeaf:()=>({openFile:async file=>{opened=file;}})}};
 const file=await p.createPost('sw-engineer/new-post');assert.equal(opened,file);assert.deepEqual(created,['sw-engineer']);const front=yaml.load(file.content.match(/^---\n([\s\S]*?)\n---/)[1]);
 assert.deepEqual(front,{title:'new-post',summary:'',created:'2026-10-17',updated:'2026-10-17',category:'',tags:[],publish:false,noindex:false,cover:'',thumbnail:'',icon:'',icon_image:''});assert.ok(file.content.endsWith('---\n\n'));
 await assert.rejects(p.createPost('sw-engineer/new-post'),/이미 있습니다/);assert.equal(files.get(file.path),file);
 await assert.rejects(p.createPost('sw-engineer/new-post.md/child'),/폴더 경로에 파일/);assert.equal(files.size,2);
});
