'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {alias,matchPost,plainBody,disqusImport,ocrCandidates,approvedBackups,mergeImports}=require('../lib/comments/import');
const catalog={aliases:new Map([['/example/','post1'],['Post title','post1'],['post1','post1']])};
const xml=posts=>`<disqus><thread dsq:id="t1"><id>https://www.anyflow.net/example</id><title>Post title</title></thread>${posts}</disqus>`;
const post=(id,parent='',extra='')=>`<post dsq:id="${id}"><message><![CDATA[<p>Hello &amp; <b>world</b></p><p>Line<br>two</p>]]></message><createdAt>2020-01-02T03:04:05Z</createdAt><author><name>Alice</name><email>PRIVATE@example.com</email><url>https://alice.example/</url></author><thread dsq:id="t1"/>${parent?`<parent dsq:id="${parent}"/>`:''}${extra}</post>`;
test('post aliases preserve exact paths and UUIDs and reject conflicting matches',()=>{
 assert.equal(alias('https://www.anyflow.net/example?x=y'),'/example/');
 assert.equal(alias('https://notion.so/p-01234567-89ab-cdef-0123-456789abcdef'),'0123456789abcdef0123456789abcdef');
 assert.equal(matchPost(catalog,['https://blog.anyflow.net/example/']),'post1');
 assert.equal(matchPost({aliases:new Map([['/a/','a'],['/b/','b']])},['/a/','/b/']),null);
});
test('Disqus export retains body, relationship, timestamp, likes, and never publishes private email',()=>{
 const result=mergeImports([disqusImport(xml(post('1')+post('2','1','<likes>3</likes>')),catalog)]);
 assert.equal(result.comments.length,2);assert.equal(result.comments[1].parent_id,'disqus-1');
 assert.equal(result.comments[0].body,'Hello & world\n\nLine\ntwo');
 assert.equal(result.comments[0].created_at,'2020-01-02T03:04:05.000Z');
 assert.equal(result.comments[0].author.link,'https://alice.example/');
 assert.equal(JSON.stringify(result.comments).includes('PRIVATE'),false);
 assert.equal(result.legacyLikes['comment:disqus-2'],3);
});
test('ambiguous threads, missing parents and source spam stay private',()=>{
 const result=mergeImports([disqusImport(xml(post('1','unknown')+post('2','','<isSpam>true</isSpam>')),catalog)]);
 assert.equal(result.comments.length,0);assert.equal(result.review.length,2);
 assert.throws(()=>disqusImport('<!DOCTYPE disqus [<!ENTITY x SYSTEM "file:///etc/passwd">]><disqus/>',catalog),/DTD/);
 assert.throws(()=>disqusImport('<html/>',catalog),/Disqus/);
});
test('HTML stripping ignores executable content and preserves visible link targets',()=>{
 assert.equal(plainBody('<script>secret</script><p>x <a href="https://example.com/a">example</a></p><style>bad</style>'),'x example (https://example.com/a)');
});
test('only explicitly reviewed backups with provenance and exact local timestamp are importable',()=>{
 const entry={candidate_id:'backup-x',post_id:'post1',author:{name:'Alice'},body:'Legacy',created_at:'2008-01-15T08:34:00',source:{provider:'backup-image',id:'x#1',timezone:null,precision:'minute'}};
 assert.equal(approvedBackups([entry],catalog).comments.length,0);
 const result=approvedBackups([{...entry,reviewed:true}],catalog);
 assert.equal(result.comments[0].created_at,entry.created_at);assert.equal(result.comments[0].owner_hash,null);
 assert.equal(approvedBackups([{...entry,reviewed:true,created_at:'2008-02-30T08:34:00'}],catalog).review.length,1);
});
test('OCR candidate generation records uncertain author, time and reply instead of approving',()=>{
 const lines=[{text:'Alice',x:.09,y:.01},{text:'Hi',x:.09,y:.02},{text:'2008. 1. 15. 08:34 • 답글',x:.09,y:.03},{text:'Bob',x:.18,y:.05},{text:'Reply',x:.18,y:.06},{text:'2008. 1. 15. 09:34 • 답글',x:.18,y:.07}];
 const result=ocrCandidates([{note:'p.md',image:'i.webp',lines}],[{note:'p.md',post_id:'post1',images:['i.webp']}]);
 assert.equal(result.length,2);assert.equal(result[1].parent_candidate_id,result[0].candidate_id);assert.equal(result[0].reviewed,false);assert.equal(result[0].created_at,null);
 assert.equal(result[0].source.local_time,'2008-01-15T08:34:00');
});
test('imports are deterministic; exact duplicates remap replies and conflicts stay private',()=>{
 const a=disqusImport(xml(post('1')+post('2','1')),catalog);a.comments[1].body='Reply';
 const b={comments:[{...a.comments[0],id:'backup-1',source:{provider:'backup-image',id:'i#1'}},{...a.comments[1],id:'backup-2',parent_id:'backup-1',body:'Other reply',source:{provider:'backup-image',id:'i#2'}}]};
 const result=mergeImports([a,b]);assert.equal(result.comments.length,3);assert.equal(result.duplicates.length,1);assert.equal(result.comments.find(c=>c.id==='backup-2').parent_id,'disqus-1');
 assert.deepEqual(mergeImports([disqusImport(xml(post('1')),catalog)]),mergeImports([disqusImport(xml(post('1')),catalog)]));
 const conflict={comments:[{...a.comments[0],body:'Changed'}]};assert.equal(mergeImports([a,conflict]).review[0].reasons[0],'conflicting_source_id');
});

test('verified admin usernames and deleted tombstones are preserved without exposing old text',()=>{
 const raw=xml(post('1','','<isDeleted>true</isDeleted>').replace('<name>Alice</name>','<name>Alice</name><username>verified_owner</username>')+post('2','1'));
 const result=mergeImports([disqusImport(raw,catalog,{adminUsernames:['verified_owner']})]);
 assert.equal(result.comments.length,2);assert.equal(result.comments[0].status,'deleted');assert.equal(result.comments[0].body,'삭제된 댓글입니다');assert.equal(result.comments[0].author.is_admin,true);assert.equal(result.comments[1].parent_id,'disqus-1');
 assert.throws(()=>disqusImport('<disqus><thread dsq:id="x">',catalog),/Incomplete/);
});
