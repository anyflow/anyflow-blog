const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),nunjucks=require('nunjucks');
const env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve('src/_includes')),{autoescape:false});
env.addFilter('absoluteUrl',url=>new URL(url,'https://www.anyflow.net').href);
env.addFilter('versionedAsset',url=>url);
env.addFilter('tagColor',()=> '#eee');
env.addFilter('tagStyle',()=> '');
env.addFilter('dateLabel',date=>new Date(date).toISOString().slice(0,10).replaceAll('-','/'));
const render=properties=>env.render('base.njk',{site:{title:'Blog',description:'Description'},home:{title:'Home'},post:{title:'Post',url:'/post',category:'Test',displayDate:'2025/01/01',tags:[],...properties}});
test('empty optional properties keep their rows with plain None placeholders',()=>{
 for(const updated of [undefined,null,'']){
  const html=render({updated});
  assert.match(html,/>Tags<\/div><div class="property-value"><span class="property-empty">None<\/span>/);
  assert.match(html,/>Updated time<\/div><div class="property-value date-property"><span class="property-empty">None<\/span>/);
 }
});
test('present dates and searchable tags replace empty placeholders',()=>{
 const html=render({updated:new Date('2026-10-18T00:00:00Z'),tags:['Kubernetes']});
 assert.match(html,/>Updated time<\/div><div class="property-value date-property">2026\/10\/18<\/div>/);
 assert.match(html,/data-search-tag="Kubernetes"/);
 assert.doesNotMatch(html,/class="property-empty"/);
});
