const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {importNotion}=require("../scripts/import-notion"),{loadContent}=require("../lib/content"),{validateContent}=require("../lib/validate-content");
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
 const records={"/post":{pageID:"a".repeat(32),vaultPath:"post/post.md",blocks:[b("a".repeat(32),"page","",["h","one","two","callout","link","format","mention"]),heading,code,image1,image2,callout,quote,link,{id:"mention",type:"text",properties:{title:[["‣",[["p","h"]]]]}},{id:"format",type:"text",properties:{title:[["Orchestra(오케스트라)",[["b"]]],["는."]]}}]}};
 assert.throws(()=>importNotion(root,records),/Verified image mapping required/);
 const result=importNotion(root,records,{},{"one":{path:"post/one.png",sha256:require("crypto").createHash("sha256").update("one").digest("hex")},"two":{path:"post/two.png",sha256:require("crypto").createHash("sha256").update("two").digest("hex")}});
 assert.equal(result.types.image,2);assert.equal(result.types.code,1);
 const raw=fs.readFileSync(path.join(root,"post/post.md"),"utf8");assert.match(raw,/icon: ⭐\n---\n/);assert.match(raw,/\[!notion\]/);assert.doesNotMatch(raw,/\*\*\*\*/);
 assert.match(raw,/post\.md#\^h/);
 const current=loadContent(root,path.join(root,"none"));validateContent(current);
 assert.match(current.posts[0].html,/src="\/assets\/post\/one.png"/);assert.match(current.posts[0].html,/src="\/assets\/post\/two.png"/);assert.match(current.posts[0].html,/<figcaption>/);
 assert.match(current.posts[0].html,/<a href="\/post\/#h">Heading<\/a>/);
 assert.match(current.posts[0].html,/<strong>Orchestra\(오케스트라\)<\/strong>는\./);
 assert.match(current.posts[0].html,/<h2[\s\S]*class="code-block"/);
});
test("generated link validation rejects missing notes and block anchors",()=>{
 const c={unresolved:[],assets:new Map(),posts:[{url:"/post/",html:'<p><a href="/other/#missing">Bad</a></p>'}]};
 assert.throws(()=>validateContent(c),/Invalid generated links/);
 c.posts.push({url:"/other/",html:""});assert.throws(()=>validateContent(c),/missing anchor/);
 c.posts[1].html='<span id="missing"></span>';validateContent(c);
});

