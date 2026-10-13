const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/js/share.js'),'utf8');
const url='https://blog.anyflow.net/글/?q=A&B=1#본문';
function fixture(navigator={}){
 const events={},alerts=[],links=['https://www.facebook.com/sharer/sharer.php?display=popup&u=','https://twitter.com/intent/tweet?text=&url=','https://www.linkedin.com/shareArticle?mini=true&url=','https://www.pinterest.co.kr/pin/create/link/?url='].map(shareBase=>({dataset:{shareBase},addEventListener:(name,fn)=>{events[shareBase+name]=fn;}}));
 const copy={addEventListener:(name,fn)=>events.copy=fn};
 const menu={open:false,style:{},querySelectorAll:()=>links,querySelector:()=>copy,matches(){return this.open;},togglePopover(){this.open=!this.open;},hidePopover(){this.open=false;}};
 const button={addEventListener:(name,fn)=>events.share=fn,getBoundingClientRect:()=>({bottom:36,right:1200})};
 vm.runInNewContext(source,{document:{title:'제목 & 공유',querySelector:()=>button,getElementById:()=>menu},navigator,location:{href:url},innerWidth:1280,alert:text=>alerts.push(text),encodeURIComponent});
 return {menu,links,alerts,click:()=>events.share({preventDefault(){}}),copy:()=>events.copy(),link:()=>events[links[0].dataset.shareBase+'click']()};
}
test('Share uses native sharing without copying; cancellation stays closed and failures open the original options',async()=>{
 let data;const native=fixture({share:async value=>{data=value;},clipboard:{writeText:()=>assert.fail('must not copy on Share')}});
 await native.click();assert.equal(data.title,'제목 & 공유');assert.equal(data.url,url);assert.equal(native.menu.open,false);assert.deepEqual(native.alerts,[]);
 const canceled=fixture({share:async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});}});await canceled.click();assert.equal(canceled.menu.open,false);
 for(const navigator of [{},{share:async()=>{throw Object.assign(new Error('blocked'),{name:'NotAllowedError'});}}]){
  const f=fixture(navigator);await f.click();assert.equal(f.menu.open,true);for(const link of f.links)assert.equal(new URL(link.href).searchParams.get('url')??new URL(link.href).searchParams.get('u'),url);
  f.link();assert.equal(f.menu.open,false);await f.click();await f.click();assert.equal(f.menu.open,false);
 }
});
test('copy is a separate explicit action and closes the popup on success or failure',async()=>{
 let copied;const success=fixture({clipboard:{writeText:async value=>{copied=value;}}});await success.click();assert.equal(copied,undefined);await success.copy();assert.equal(copied,url);assert.deepEqual(success.alerts,['Copied!']);assert.equal(success.menu.open,false);
 const denied=fixture({clipboard:{writeText:async()=>{throw new Error('denied');}}});await denied.click();await denied.copy();assert.deepEqual(denied.alerts,['Copy failed...']);assert.equal(denied.menu.open,false);
});
test('home and post expose the same accessible share options with local icons',()=>{
 const nunjucks=require('nunjucks'),env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname,'../src/_includes')));
 for(const name of ['versionedAsset','tagColor','tagStyle','dateLabel'])env.addFilter(name,s=>s);
 env.addFilter('absoluteUrl',url=>new URL(url,require('../src/_data/site.json').url).href);
 for(const post of [null,{title:'Title',url:'/one/',tags:[],toc:[],category:'Category'}]){
  const html=env.render('base.njk',{site:{title:'Blog'},home:{},post,content:''});
  assert.match(html,/popovertarget="share-menu"/);assert.match(html,/id="share-menu"[^>]*popover="auto"[^>]*aria-label="공유"/);
  assert.equal((html.match(/data-share-base=/g)||[]).length,4);assert.match(html,/\/js\/share.js/);
  for(const name of ['facebook','twitter','linkedin','pinterest']){assert.match(html,new RegExp('/images/reference/share/'+name+'.png'));assert.ok(fs.existsSync(path.join(__dirname,'../src/images/reference/share',name+'.png')));}
  assert.doesNotMatch(html,/cdn\.lazyrockets\.com/);
 }
});
