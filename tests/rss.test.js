const test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),fs=require('node:fs');
const {rss,summary}=require('../lib/rss');
const site={title:'Blog & 이야기',description:'새 글',url:'https://www.anyflow.net'},post={publish:true,title:'글',url:'/post',created:'2026-01-01',category:'S/W',tags:['test-tag'],html:'<p>본문</p>'};
function parse(xml){return JSON.parse(execFileSync('python3',['-c',`import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read());c=r.find('channel')
print(json.dumps({'version':r.attrib['version'],'self':c.find('{http://www.w3.org/2005/Atom}link').attrib['href'],'title':c.findtext('title'),'items':[{**{k:i.findtext(k) for k in ['title','link','guid','pubDate','description']},'categories':[x.text for x in i.findall('category')]} for i in c.findall('item')]}))`],{input:xml,encoding:'utf8'}));}
test('RSS 2.0 is valid XML, limits to 50 newest discoverable published posts and uses canonical absolute URLs',()=>{
 const posts=Array.from({length:55},(_,i)=>({...post,url:'/post-'+i,created:new Date(Date.UTC(2025,0,i+1)).toISOString()}));
 const feed=parse(rss({site,posts:[...posts,{...post,url:'/hidden',noindex:true},{...post,url:'/draft',publish:false}]}));
 assert.equal(feed.version,'2.0');assert.equal(feed.self,site.url+'/rss.xml');assert.equal(feed.title,site.title);assert.equal(feed.items.length,50);assert.equal(feed.items[0].link,site.url+'/post-54');assert.equal(feed.items.at(-1).link,site.url+'/post-5');assert(feed.items.every(i=>i.guid===i.link));assert.deepEqual(feed.items[0].categories,['S/W','test tag']);
});
test('summary and representative image are safely encoded, with no injected markup or invalid XML characters',()=>{
 const feed=parse(rss({site,posts:[{...post,title:'"제목" & <태그>\u0001',summary:'<script>alert(1)</script> & 요약',ogImage:'/images/cards/a.png?x=1&y=2'}]})),item=feed.items[0];
 assert.equal(item.title,'"제목" & <태그>');assert.match(item.description,/src="https:\/\/www.anyflow.net\/images\/cards\/a.png\?x=1&amp;y=2"/);assert.match(item.description,/&lt;script&gt;/);assert.doesNotMatch(item.description,/<script>/);assert.match(item.description,/원문 읽기/);
 for(const image of ['https://i.ytimg.com/vi/test/hqdefault.jpg','https://pbs.twimg.com/media/test.jpg'])assert(parse(rss({site,posts:[{...post,thumbnail:image}]})).items[0].description.includes(image));
});
test('fallback summary excludes code and media, decodes text, and caps Unicode characters',()=>{
 assert.equal(summary({...post,html:'<pre class="mermaid">secret diagram code</pre><figure><img><figcaption>caption</figcaption></figure><p>Hello <strong>세계</strong> &amp; next.</p><p>later</p>'}),'Hello 세계 & next.');
 assert.equal(Array.from(summary({...post,html:'<p>'+'가'.repeat(400)+'</p>'})).length,301);assert.equal(summary({...post,summary:'직접 요약'}),'직접 요약');
});
test('edits preserve GUID and publication date; removing or unpublishing a post removes the item',()=>{
 const before=parse(rss({site,posts:[post]})).items[0],after=parse(rss({site,posts:[{...post,title:'수정',updated:'2026-02-01'}]})).items[0];assert.equal(before.guid,after.guid);assert.equal(before.pubDate,after.pubDate);assert.notEqual(before.title,after.title);
 assert.equal(parse(rss({site,posts:[]})).items.length,0);assert.equal(parse(rss({site,posts:[{...post,publish:false}]})).items.length,0);
});
test('feed has the RSS media type in nginx and generation is deterministic',()=>{
 assert.equal(rss({site,posts:[post]}),rss({site,posts:[post]}));const nginx=fs.readFileSync(require.resolve('../deployment/nginx.conf'),'utf8');assert.match(nginx,/location = \/rss\.xml \{[^}]*if[^\n]*\n\s*types \{ \}\s*default_type application\/rss\+xml;/);
});
