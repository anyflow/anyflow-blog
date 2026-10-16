'use strict';
const fs=require('node:fs'),path=require('node:path');
function preserveAssetUrls(root,content,output){
 const file=path.join(root,'_assets/_meta/path-migration.json');if(!fs.existsSync(file))return 0;
 const plan=JSON.parse(fs.readFileSync(file,'utf8'));let count=0;
 for(const [from,to]of Object.entries(plan.files||{})){
  const source=path.resolve(root,to),url=content.assets.get(source);if(!url)continue;
  if(from===to)continue;
  if(from.startsWith('/')||/[\\\u0000]/.test(from)||from.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('Invalid legacy asset path');
  const legacy=path.resolve(output,'assets',from),target=path.resolve(output,'.'+decodeURIComponent(url));
  if(!legacy.startsWith(path.resolve(output)+path.sep)||!target.startsWith(path.resolve(output)+path.sep))throw new Error('Asset alias leaves output');
  if(fs.existsSync(legacy))throw new Error('Legacy asset URL collision: '+from);
  fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.symlinkSync(path.relative(path.dirname(legacy),target),legacy);count++;
 }
 return count;
}
module.exports={preserveAssetUrls};
