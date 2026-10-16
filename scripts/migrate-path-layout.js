#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const [kind,rootArg,planArg,...options]=process.argv.slice(2),reverse=options.includes('--reverse');
if(!['plan','content','comments','queue'].includes(kind)||!rootArg||!planArg)throw new Error('Usage: node scripts/migrate-path-layout.js plan|content|comments|queue ROOT PLAN [--reverse]');
const root=path.resolve(rootArg),file=path.resolve(planArg);
(async()=>{
 if(kind==='plan'){const plan=require('../lib/path-migration').makePlan(root);fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n');console.log({files:Object.keys(plan.files).length,posts:Object.keys(plan.ids).length});return;}
 const plan=JSON.parse(fs.readFileSync(file,'utf8'));
 if(kind==='content')console.log({files:require('../lib/path-migration').applyContent(root,plan,reverse),reverse});
 if(kind==='comments'){const result=await require('../lib/comments/path-migration').migrateRepository(root,plan,reverse);console.log({...result.summary,reverse});}
 if(kind==='queue'){
  const record=JSON.parse(fs.readFileSync(root,'utf8')),result=require('../lib/comments/path-migration').transformQueue(record,plan,reverse);
  const temp=root+'.migration.tmp',fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(result)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,root);const dir=fs.openSync(path.dirname(root),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}console.log({jobs:result.jobs.length,receipts:Object.keys(result.receipts).length,reverse});
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
