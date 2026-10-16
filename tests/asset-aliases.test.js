const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {preserveAssetUrls}=require('../lib/asset-aliases');
test('legacy public asset URLs resolve to the new media without duplicate bytes or path escape',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-alias-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const contentRoot=path.join(root,'content'),output=path.join(root,'site');fs.mkdirSync(path.join(contentRoot,'_assets/_meta'),{recursive:true});fs.mkdirSync(path.join(output,'assets/_assets/cat/post'),{recursive:true});
 const target=path.join(output,'assets/_assets/cat/post/a.png');fs.writeFileSync(target,'bytes');
 const manifest=path.join(contentRoot,'_assets/_meta/path-migration.json');fs.writeFileSync(manifest,JSON.stringify({files:{'cat/post/a.png':'_assets/cat/post/a.png'}}));
 const content={assets:new Map([[path.join(contentRoot,'_assets/cat/post/a.png'),'/assets/_assets/cat/post/a.png']])};
 assert.equal(preserveAssetUrls(contentRoot,content,output),1);const alias=path.join(output,'assets/cat/post/a.png');assert.ok(fs.lstatSync(alias).isSymbolicLink());assert.equal(fs.readFileSync(alias,'utf8'),'bytes');
 fs.writeFileSync(manifest,JSON.stringify({files:{'../../escape':'_assets/cat/post/a.png'}}));assert.throws(()=>preserveAssetUrls(contentRoot,content,output),/Invalid legacy/);
});
