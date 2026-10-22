const test=require('node:test'),assert=require('node:assert/strict'),links=require('../lib/link-preview');
const url='https://github.com/a/b',html='<meta property="og:title" content="a/b"><meta property="og:image" content="https://images.example/card.png"><meta property="og:description" content="Page description">';
test('GitHub API fields and HTML cover are combined; either source can fail',async()=>{
 const api={name:'b',description:'API description',owner:{login:'a',avatar_url:'https://images.example/avatar.png'}};
 const value=await links.metadata(url,async u=>u.includes('api.github.com')?JSON.stringify(api):html);
 assert.equal(value.title,'b');assert.equal(value.cover,'https://images.example/card.png');assert.equal(value.description,'API description');assert.equal(value.avatar,api.owner.avatar_url);assert.equal(value.metadataVersion,links.METADATA_VERSION);
 const fallback=await links.metadata(url,async u=>{if(u.includes('api.github.com'))throw Error('rate limited');return html;});assert.equal(fallback.title,'a/b');assert.equal(fallback.cover,value.cover);
 const apiOnly=await links.metadata(url,async u=>{if(!u.includes('api.github.com'))throw Error('HTML blocked');return JSON.stringify(api);});assert.equal(apiOnly.title,'b');
 await assert.rejects(links.metadata(url,async()=>{throw Error('offline');}),/offline/);
});
test('issue and PR descriptions use body and author, while Twitter tags supplement missing OG tags',async()=>{
 const value=await links.metadata(url+'/pull/7',async u=>u.includes('api.github.com')?JSON.stringify({title:'PR',body:'Request body\nsecond line',user:{login:'contributor'},state:'open',number:7}):html);
 assert.equal(value.description,'Request body second line');assert.equal(value.author,'contributor');assert.equal(value.number,'7');assert.equal(value.cover,'https://images.example/card.png');
 const twitter=links.pageMetadata('<meta name="twitter:title" content="Title"><meta name="twitter:description" content="Description"><meta name="twitter:image" content="/pic.png">','https://example.com');assert.equal(twitter.description,'Description');assert.equal(twitter.cover,'https://example.com/pic.png');
 const og=links.pageMetadata('<meta property="og:image" content="/og.png"><meta name="twitter:image" content="/twitter.png">','https://example.com');assert.equal(og.cover,'https://example.com/og.png');
});
