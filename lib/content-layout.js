'use strict';
const {validPostId}=require('./comments/post-key');
function noteUrl(relative){
 if(relative==='index.md')return '/';
 const url=/^_categories\/[^/]+\.md$/.test(relative)?'/category/'+relative.slice('_categories/'.length,-3):'/'+relative.replace(/\.md$/,'');
 if(!relative.endsWith('.md')||!validPostId(url)||url==='/')throw new Error('Invalid note path: '+relative);
 return url;
}
module.exports={noteUrl};
