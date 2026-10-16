'use strict';
const {validPostId}=require('./comments/post-key');
function noteUrl(relative,home=false){
 if(home){if(relative!=='blog.md')throw new Error('Root note must be blog.md');return '/';}
 const url='/'+relative.replace(/\.md$/,'');
 if(!relative.endsWith('.md')||!validPostId(url)||url==='/')throw new Error('Invalid note path: '+relative);
 return url;
}
module.exports={noteUrl};
