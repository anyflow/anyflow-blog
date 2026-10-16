'use strict';
const {createHash}=require('node:crypto');
function validPostId(value){
 if(typeof value!=='string'||value.length>2048)return false;
 if(/^[A-Za-z0-9_-]{1,256}$/.test(value))return true;
 return value==='/'||value.startsWith('/')&&!/[\s%?#\\\u0000-\u001f]/.test(value)&&value.slice(1).split('/').every(p=>p&&p!=='.'&&p!=='..'&&!p.startsWith('_'));
}
function publicFile(value){if(!validPostId(value))throw new Error('Invalid post identifier');return (value.startsWith('/')?createHash('sha256').update(value).digest('hex'):value)+'.json';}
module.exports={validPostId,publicFile};
