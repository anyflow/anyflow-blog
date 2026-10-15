const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {importNotion}=require("../scripts/import-notion"),{loadContent}=require("../lib/content"),{validateContent}=require("../lib/validate-content");
test("Notion metadata includes empty clean URLs and noindex head injection, preserving ordinary code",()=>{
 const metadata=require("../lib/notion-metadata"),b=code=>({type:"code",properties:{title:[[code]]}});
 assert.equal(metadata(b('title: Trip\ndescription: ""\ncleanUrl: \nfloatFirstTOC: right')),true);
 assert.equal(metadata(b('title: Trip\ncleanUrl: "/trip"')),true);
 assert.equal(metadata(b('<head>\n  <meta name="robots" content="noindex">\n</head>')),true);
 assert.equal(metadata(b('const title = "Trip";')),false);
 assert.equal(metadata(b('<meta name="robots" content="noindex">')),false);
});
test("source block import preserves metadata, image identity, captions, nested blocks and links",t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"notion-import-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,"_assets/visuals"),{recursive:true});fs.mkdirSync(path.join(root,"post"));
 fs.writeFileSync(path.join(root,"_assets/visuals/manifest.json"),JSON.stringify({emojis:{},pages:{"/post":{pageId:"a".repeat(32),vaultPath:"post/post.md",title:"Title"}}}));
 fs.writeFileSync(path.join(root,"post/post.md"),'---\ntitle: Title\npermalink: /post\ncreated: 2025-01-01\ncategory: test\nkind: post\ndraft: false\nicon: ⭐\n---Old body.');
 fs.writeFileSync(path.join(root,"post/one.png"),"one");fs.writeFileSync(path.join(root,"post/two.png"),"two");
 const rich=s=>[[s]],b=(id,type,title,content)=>({id,type,properties:{title:rich(title)},content});
 const image1={id:"one",type:"image",properties:{title:rich("Untitled.png"),caption:[["First!\n\nSecond."]]},format:{block_width:528}};
 const image2={id:"two",type:"image",properties:{title:rich("Untitled.png")}};
 const heading=b("h","header","Heading",["code"]),code={id:"code",type:"code",properties:{title:rich("echo 'hello'"),language:rich("bash")}};
 const quote=b("quote","quote","Quoted text"),callout=b("callout","callout","Info",["quote"]);
 const link={id:"link",type:"text",properties:{title:[["Next",[["a","https://www.anyflow.net/"+"a".repeat(32)+"?v="+"b".repeat(32)+"#h"],["b"],["b"]]]]}};
 const records={"/post":{pageID:"a".repeat(32),vaultPath:"post/post.md",blocks:[b("a".repeat(32),"page","",["h","layout","callout","link","format","mention","imageMention"]),heading,code,image1,image2,{id:"layout",type:"column_list",content:["left","right"]},{id:"left",type:"column",format:{column_ratio:0.25},content:["one"]},{id:"right",type:"column",format:{column_ratio:0.75},content:["two"]},callout,quote,link,{id:"imageMention",type:"text",properties:{title:[["‣",[["p","one"]]]]}},{id:"mention",type:"text",properties:{title:[["‣",[["p","h"]]]]}},{id:"format",type:"text",properties:{title:[["Orchestra(오케스트라)",[["b"]]],["는."]]}}]}};
 assert.throws(()=>importNotion(root,records),/Verified image mapping required/);
 const result=importNotion(root,records,{},{"one":{path:"post/one.png",sha256:require("crypto").createHash("sha256").update("one").digest("hex")},"two":{path:"post/two.png",sha256:require("crypto").createHash("sha256").update("two").digest("hex")}});
 assert.equal(result.types.column_list,1);assert.equal(result.types.column,2);
 assert.equal(result.types.image,2);assert.equal(result.types.code,1);
 const raw=fs.readFileSync(path.join(root,"post/post.md"),"utf8");assert.match(raw,/icon: ⭐\n---\n/);assert.match(raw,/\[!notion\]/);assert.doesNotMatch(raw,/\*\*\*\*/);
 assert.match(raw,/post\.md#\^layout/);assert.match(raw,/\^layout/);
 assert.match(raw,/\[!column\|0.25\]/);assert.match(raw,/\[!columns\]/);
 assert.match(raw,/post\.md#\^h/);
 const current=loadContent(root,path.join(root,"none"));validateContent(current);
 assert.match(current.posts[0].html,/src="\/assets\/post\/one.png"/);assert.match(current.posts[0].html,/src="\/assets\/post\/two.png"/);assert.match(current.posts[0].html,/<figcaption>/);
 assert.match(current.posts[0].html,/<a href="\/post#h">Heading<\/a>/);
 assert.match(current.posts[0].html,/<strong>Orchestra\(오케스트라\)<\/strong>는\./);
 assert.match(current.posts[0].html,/<h2[\s\S]*class="code-block"/);
});
test("generated link validation rejects missing notes and block anchors",()=>{
 const c={unresolved:[],assets:new Map(),posts:[{url:"/post/",html:'<p><a href="/other/#missing">Bad</a></p>'}]};
 assert.throws(()=>validateContent(c),/Invalid generated links/);
 c.posts.push({url:"/other/",html:""});assert.throws(()=>validateContent(c),/missing anchor/);
 c.posts[1].html='<span id="missing"></span>';validateContent(c);
});
test("empty paragraphs and paragraph line breaks survive import without changing code or previews",t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"notion-spacing-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,"_assets/visuals"),{recursive:true});
 const header='---\ntitle: Spacing\npermalink: /spacing\npost_id: spacing-test-123\ncreated: 2025-01-01\ncategory: test\nkind: post\ndraft: false\nicon: ⭐\n---';
 fs.writeFileSync(path.join(root,"spacing.md"),header+'\n\nOld body.');
 fs.writeFileSync(path.join(root,"_assets/visuals/manifest.json"),JSON.stringify({emojis:{},pages:{"/spacing":{pageId:"page",vaultPath:"spacing.md",title:"Spacing"}}}));
 const block=(id,type,title="",content=[])=>({id,type,properties:{title:[[title]]},content});
 const first=block("first","text","\nFirst\nsecond\n\n<strong>literal</strong>\n");
 const formatted=block("formatted","text");formatted.properties.title=[["Bold\n\nnext",[["b"]]],[" and "],["code\ncode",[["c"]]],[" then `literal`\n\nend"]];
 const image={id:"image",type:"image",properties:{caption:[["Caption."]]}};
 const map={image:{path:"photo.png",sha256:require("crypto").createHash("sha256").update("image").digest("hex")}};
 fs.writeFileSync(path.join(root,"photo.png"),"image");
 const blocks=[block("page","page","",["empty1","empty2","first","formatted","quote","callout","list","columns","parent","code"]),block("empty1","text"),block("empty2","text"),first,formatted,
  block("quote","quote","\nQuoted\n\ntext\n",["quoteEmpty"]),block("quoteEmpty","text"),
  block("callout","callout","Info\n\nnext",["calloutEmpty"]),block("calloutEmpty","text"),
  block("list","bulleted_list","List\n",["listEmpty"]),block("listEmpty","text"),
  block("columns","column_list","",["column"]),{...block("column","column","",["columnEmpty"]),format:{column_ratio:1}},block("columnEmpty","text"),
  block("parent","text","",["image"]),image,{...block("code","code","a\n\nb\n"),properties:{title:[["a\n\nb\n"]],language:[["text"]]}}];
 const reference={"/spacing":{pageID:"page",vaultPath:"spacing.md",blocks}},report=importNotion(root,reference,{},map);
 const raw=fs.readFileSync(path.join(root,"spacing.md"),"utf8");assert.equal(raw.slice(0,header.length),header);
 assert.deepEqual(report.emptyParagraphs.map(p=>p.id),["empty1","empty2","quoteEmpty","calloutEmpty","listEmpty","columnEmpty","parent"]);
 assert.equal(report.paragraphLineBreaks.length,5);
 assert.match(raw,/<br>First\nsecond<br><br>\\<strong\\>literal\\<\/strong\\><br>/);
 assert.match(raw,/<strong>Bold<\/strong><br><br><strong>next<\/strong>/);
 assert.match(raw,/`code\ncode`/);assert.match(raw,/\\`literal\\`<br><br>end/);
 assert.match(raw,/```text\na\n\nb\n\n```/);
 const current=loadContent(root,path.join(root,"none"));validateContent(current);
 const post=current.posts[0];
 assert.equal((post.html.match(/class="notion-empty-paragraph"/g)||[]).length,7);
 assert.match(post.html,/<p><br>First<br>\nsecond<br><br>&lt;strong&gt;literal&lt;\/strong&gt;<br><\/p>/);
 assert.match(post.html,/<code>code code<\/code>/);
 assert.match(post.html,/<blockquote>\s*<p><br>Quoted<br><br>text<br><\/p>/);
 assert.match(post.html,/data-notion-block-id="parent"[^>]*><br><\/p>\s*<figure/);
 assert.doesNotMatch(post.preview,/notion-empty-paragraph/);
 assert.match(post.preview,/First[\s\S]*Bold[\s\S]*Quoted[\s\S]*Info/);
 fs.writeFileSync(path.join(root,"reference.json"),JSON.stringify(reference));fs.writeFileSync(path.join(root,"images.json"),JSON.stringify(map));
 const audit=()=>require("node:child_process").spawnSync(process.execPath,[path.resolve(__dirname,"../scripts/audit-import.js"),root,path.join(root,"reference.json"),path.join(root,"images.json"),path.join(root,"audit.json")],{encoding:"utf8"});
 assert.equal(audit().status,0);
 fs.writeFileSync(path.join(root,"spacing.md"),raw.replace('data-notion-block-id="empty1"','data-notion-block-id="wrong"'));
 const failed=audit();assert.equal(failed.status,1);assert.match(failed.stdout,/empty paragraph order or identity mismatch/);
});

test('table inline code keeps real newlines and literal Markdown or HTML characters',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'notion-table-code-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'_assets/visuals'),{recursive:true});
 fs.writeFileSync(path.join(root,'table.md'),'---\ntitle: Table\npermalink: /table\npost_id: table-code-123\ncreated: 2025-01-01\ncategory: test\nkind: post\ndraft: false\n---\n\nOld');
 fs.writeFileSync(path.join(root,'_assets/visuals/manifest.json'),JSON.stringify({pages:{'/table':{pageId:'table-code-123',vaultPath:'table.md'}}}));
 const code='A<B> *x* | '+String.fromCharCode(96)+'value'+String.fromCharCode(96)+'\n  y\\z';
 const blocks=[{id:'page',type:'page',content:['table']},{id:'table',type:'table',content:['head','row'],format:{table_block_column_order:['a','b']}},{id:'head',type:'table_row',properties:{a:[['Code']],b:[['Literal']]}},{id:'row',type:'table_row',properties:{a:[[code,[['c']]]],b:[['literal <br>',[['c']]]]}}];
 importNotion(root,{'/table':{pageID:'page',vaultPath:'table.md',blocks}});
 const html=loadContent(root,path.join(root,'none')).posts[0].html;
 assert.match(html,/<code>A&lt;B&gt; \*x\* \| .value.<br>  y\\z<\/code>/);
 assert.match(html,/<code>literal &lt;br&gt;<\/code>/);
 assert.doesNotMatch(html,/<em>x<\/em>/);
});

test('bookmark import retains description, cover and favicon instead of flattening to a Markdown link',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-import-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'_assets/visuals'),{recursive:true});fs.mkdirSync(path.join(root,'post'));
 fs.writeFileSync(path.join(root,'_assets/visuals/manifest.json'),JSON.stringify({pages:{},emojis:{}}));
 fs.writeFileSync(path.join(root,'post/post.md'),'---\ntitle: Title\npermalink: /post\ncreated: 2025-01-01\ncategory: test\nkind: post\ndraft: false\n---\nOld.');
 const b={id:'bookmark',type:'bookmark',properties:{link:[['https://example.com/']],title:[['Title & more']],description:[['Description']]},format:{bookmark_cover:'https://example.com/cover.png',bookmark_icon:'https://example.com/icon.png'}};
 importNotion(root,{'/post':{pageID:'page',vaultPath:'post/post.md',blocks:[{id:'page',type:'page',content:['bookmark']},b]}});
 const body=fs.readFileSync(path.join(root,'post/post.md'),'utf8');
 assert.match(body,/class="bookmark bookmark-card"/);assert.match(body,/Title &amp; more/);assert.match(body,/Description/);assert.match(body,/class="bookmark-cover"/);assert.match(body,/class="bookmark-icon"/);
 const item=loadContent(root,path.join(root,'missing.json')).posts[0];assert.equal(item.thumbnail,'https://example.com/cover.png');
});
