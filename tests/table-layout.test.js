const test=require('node:test'),assert=require('node:assert/strict'),MarkdownIt=require('markdown-it');
const {parseLayout,setDimension,layoutMarkdown}=require('../lib/table-layout');
test('layout comments accept only bounded sizes and auto values',()=>{
 assert.deepEqual(parseLayout('  <!-- table-layout widths="160,280,auto" min-heights="auto,80" -->'),{widths:[160,280,'auto'],'min-heights':['auto',80]});
 for(const value of ['widths="-2"','widths="99999999"','widths="24px"','widths="40" onclick="evil"','widths="40" widths="80"'])assert.equal(parseLayout('<!-- table-layout '+value+' -->'),null);
});
test('editing one dimension preserves the other, table text and list indentation',()=>{
 const source='- item\n\n  | A | B |\n  | --- | --- |\n  | x | y |';
 const width=setDimension(source,2,'widths',1,180,[80,80]);assert.ok(width.includes('  <!-- table-layout widths="80,180" -->\n\n  | A'));
 const height=setDimension(width,4,'min-heights',1,90);assert.ok(height.includes('widths="80,180" min-heights="auto,90"'));assert.ok(height.endsWith('  | x | y |'));
 const reset=setDimension(height,4,'min-heights',1,'auto');assert.equal(reset,width);assert.throws(()=>setDimension(source,2,'widths',0,0));
});
test('website emits column widths, row minimum heights and scrolling for ordinary and nested tables',()=>{
 const md=new MarkdownIt({html:true}).use(layoutMarkdown);
 for(const prefix of ['', '- item\n\n']){const indent=prefix?'  ':'',source=prefix+['<!-- table-layout widths="120,180" min-heights="auto,80" -->','| A | B |','| --- | --- |','| x | y |'].map(s=>indent+s).join('\n'),html=md.render(source);
 assert.match(html,/class="table-layout-scroll"/);assert.match(html,/width:300px/);assert.match(html,/<col style="width:120px">/);assert.match(html,/<tr style="height:80px">/);}
 const plain=md.render('| A | B |\n| --- | --- |\n| x | y |');assert.doesNotMatch(plain,/table-has-layout|table-layout-scroll/);
});
test('code examples do not apply layout to later tables',()=>{
 const md=new MarkdownIt({html:true}).use(layoutMarkdown),html=md.render('```md\n<!-- table-layout widths="120,180" -->\n```\n\n| A | B |\n| --- | --- |\n| x | y |');assert.doesNotMatch(html,/class="table-has-layout"/);
});
