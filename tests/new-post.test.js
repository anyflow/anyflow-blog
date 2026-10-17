const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),yaml=require('js-yaml');
function load(){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.resolve('integrations/obsidian-blog-links/plugin.js'),'utf8'),{module,require:name=>name==='obsidian'?{Plugin:class{},Modal:class{},parseYaml:yaml.load,moment:()=>({format:format=>format==='YYYY-MM-DD'?'2026-10-17':'08:30'})}:{}});return module.exports;}
test('new post paths reject traversal, reserved pages and nonpublic paths',()=>{
 const {newPostPath}=load();assert.equal(newPostPath('sw-engineer/new-post'),'sw-engineer/new-post.md');assert.equal(newPostPath('새글.md'),'새글.md');
 for(const value of ['', '/', 'blog.md','Blog','../escape','a/../b','a//b','_templates/one','.obsidian/one','a/space name','a?b','a%20b','a\\b'])assert.throws(()=>newPostPath(value),/파일 경로/);
});
test('creation reads the current template, forces an unpublished draft and never overwrites',async()=>{
 const Plugin=load(),p=new Plugin(),files=new Map([['_templates/블로그 글.md',{path:'_templates/블로그 글.md'}]]),created=[];let body='---\ntitle: >-\n  {{title}}\ncreated: "{{date:YYYY-MM-DD}}"\npublish: true\nnoindex: false\n---\n\nTemplate body.',opened;
 p.app={vault:{getAbstractFileByPath:path=>files.get(path),read:async()=>body,createFolder:async path=>{created.push(path);files.set(path,{children:[]});},create:async(path,content)=>{assert.ok(!files.has(path));const file={path,content};files.set(path,file);return file;}},workspace:{getLeaf:()=>({openFile:async file=>{opened=file;}})}};
 const file=await p.createPost('sw-engineer/new-post');assert.equal(opened,file);assert.deepEqual(created,['sw-engineer']);assert.match(file.content,/title: >-\n  new-post/);assert.match(file.content,/created: "2026-10-17"/);assert.match(file.content,/publish: false/);assert.match(file.content,/noindex: false/);assert.ok(file.content.endsWith('Template body.'));
 await assert.rejects(p.createPost('sw-engineer/new-post'),/이미 있습니다/);assert.equal(files.get(file.path),file);
 body=body.replace('Template body.','Updated template.').replace('publish: true','extra: preserved');const second=await p.createPost('sw-engineer/second');assert.match(second.content,/publish: false/);assert.ok(second.content.endsWith('Updated template.'));assert.match(second.content,/extra: preserved/);
 files.delete('_templates/블로그 글.md');await assert.rejects(p.createPost('another/three'),/템플릿/);assert.ok(!files.has('another'));
});
