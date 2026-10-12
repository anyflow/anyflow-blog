const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {spawnSync}=require("node:child_process");
test("empty content fails before replacing the published output",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"blog-empty-build-"));
  try {
    fs.mkdirSync(path.join(root,"content"));fs.mkdirSync(path.join(root,"_preview"));
    const existing=path.join(root,"_preview/index.html");fs.writeFileSync(existing,"previous published result");
    const result=spawnSync(process.execPath,[path.resolve(__dirname,"../scripts/build.js")],{cwd:root,env:{...process.env,BLOG_CONTENT_DIR:path.join(root,"content"),BLOG_OUTPUT_DIR:"_preview"},encoding:"utf8"});
    assert.notEqual(result.status,0);assert.match(result.stderr,/Build requires at least one published post/);
    assert.equal(fs.readFileSync(existing,"utf8"),"previous published result");
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test("a missing attachment fails before replacing the published output",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"blog-invalid-build-"));
 try {
  fs.mkdirSync(path.join(root,"content"));fs.mkdirSync(path.join(root,"_preview"));
  const existing=path.join(root,"_preview/index.html");fs.writeFileSync(existing,"previous result");
  fs.writeFileSync(path.join(root,"content/post.md"),'---\ntitle: Test\npermalink: /test\ncreated: 2025-01-01\ncategory: test\nkind: post\ndraft: false\n---\n\n![Missing](missing.png)');
  const result=spawnSync(process.execPath,[path.resolve(__dirname,"../scripts/build.js")],{cwd:root,env:{...process.env,BLOG_CONTENT_DIR:path.join(root,"content"),BLOG_OUTPUT_DIR:"_preview"},encoding:"utf8"});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Unresolved content references/);assert.equal(fs.readFileSync(existing,"utf8"),"previous result");
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
