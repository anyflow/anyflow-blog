#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {postCatalog,disqusImport,backupInventory,ocrCandidates,approvedBackups,mergeImports}=require('../lib/comments/import');
const args=process.argv.slice(2),options={xml:[],backup:[],adminUsernames:[]};
for(let i=0;i<args.length;i++){
  const key=args[i].replace(/^--/,'');
  if(!['vault','out','xml','backup','ocr','admin-user'].includes(key)||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Usage: node scripts/import-comments.js --vault CONTENT --out PRIVATE_DIR [--xml EXPORT.xml] [--backup REVIEWED.json] [--ocr OCR.json]');
  const raw=args[++i];if(key==='admin-user'){options.adminUsernames.push(raw);continue;}
  const value=path.resolve(raw);if(Array.isArray(options[key]))options[key].push(value);else options[key]=value;
}
if(!options.vault||!options.out)throw new Error('--vault and --out are required');
const catalog=postCatalog(options.vault),output=options.out,app=path.resolve(__dirname,'..');
for(const publicRoot of [catalog.root,...['src','_site','_preview'].map(dir=>path.join(app,dir))])if(output===publicRoot||output.startsWith(publicRoot+path.sep))throw new Error('Import output must be outside public content/build directories');
if(fs.existsSync(output)&&fs.readdirSync(output).length)throw new Error('Output directory must be new or empty; existing migration originals are never overwritten');
fs.mkdirSync(output,{recursive:true,mode:0o700});
const save=(relative,value)=>{const file=path.join(output,relative);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{mode:0o600});};
const inventory=backupInventory(catalog),groups=[];
for(const [index,file]of options.xml.entries()){
  const xml=fs.readFileSync(file,'utf8');groups.push(disqusImport(xml,catalog,{adminUsernames:options.adminUsernames}));save(`original/disqus-${index+1}.xml`,xml);
}
for(const [index,file]of options.backup.entries()){
  const raw=fs.readFileSync(file,'utf8');groups.push(approvedBackups(JSON.parse(raw),catalog));save(`original/reviewed-${index+1}.json`,raw);
}
for(const block of inventory){
  save('original/backup/'+block.note,block.raw);
  for(const image of block.images){
    const file=path.resolve(catalog.root,image);
    if(!file.startsWith(catalog.root+path.sep)||!fs.realpathSync(file).startsWith(catalog.root+path.sep))throw new Error('Backup image outside vault: '+image);
    const dest=path.join(output,'original/backup',image);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.copyFileSync(file,dest);fs.chmodSync(dest,0o600);
  }
}
if(options.ocr){const raw=fs.readFileSync(options.ocr,'utf8');save('original/ocr.json',raw);save('ocr-candidates.json',ocrCandidates(JSON.parse(raw),inventory));}
const result=mergeImports(groups);
save('comments.json',result.comments);save('review.json',result.review);save('duplicates.json',result.duplicates);save('legacy-likes.json',result.legacyLikes);save('posts.json',catalog.posts);save('backup-blocks.json',inventory);
const summary={importable:result.comments.length,review:result.review.length,duplicates:result.duplicates.length,backup_posts:new Set(inventory.map(b=>b.post_id)).size,backup_images:inventory.reduce((n,b)=>n+b.images.length,0),legacy_like_targets:Object.keys(result.legacyLikes).length};
save('summary.json',summary);console.log(JSON.stringify(summary));
