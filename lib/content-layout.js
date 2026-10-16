'use strict';
const {validPostId}=require('./comments/post-key');
function noteUrl(relative){
 if(relative==='blog.md')return '/';
 const url='/'+relative.replace(/\.md$/,'');
 if(!relative.endsWith('.md')||!validPostId(url)||url==='/')throw new Error('Invalid note path: '+relative);
 return url;
}
module.exports={noteUrl};
