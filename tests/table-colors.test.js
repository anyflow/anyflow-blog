const test=require('node:test'),assert=require('node:assert/strict'),MarkdownIt=require('markdown-it');
const {colorMarkdown,setCellColor}=require('../lib/table-colors');
test('background markers color header and body cells while preserving inline formatting',()=>{
 const md=new MarkdownIt().use(colorMarkdown),html=md.render('| {bg:red} **A** | B |\n| --- | --- |\n| {bg:green} `code` | {bg:yellow} |');
 assert.match(html,/<th data-cell-bg="red"><strong>A<\/strong>/);assert.match(html,/<td data-cell-bg="green"><code>code<\/code>/);assert.match(html,/<td data-cell-bg="yellow"><\/td>/);assert.doesNotMatch(html,/\{bg:/);
});
test('invalid colors, inline code, ordinary paragraphs and mid-cell text stay unchanged',()=>{
 const md=new MarkdownIt().use(colorMarkdown),html=md.render('{bg:red} paragraph\n\n| A | B |\n| --- | --- |\n| `{bg:red}` | {bg:evil} x |\n| prefix {bg:green} | \\| |');assert.doesNotMatch(html,/data-cell-bg/);assert.match(html,/\{bg:red\} paragraph/);assert.match(html,/<code>\{bg:red\}<\/code>/);
});
test('editing one cell preserves escaped pipes, inline code, indentation and the rest of the row',()=>{
 const line='  | left \\| side | **value** | `x` |';const changed=setCellColor(line,1,'green');assert.equal(changed,'  | left \\| side | {bg:green} **value** | `x` |');assert.equal(setCellColor(changed,1,''),line);assert.equal(setCellColor(changed,1,'red'),changed.replace('green','red'));assert.throws(()=>setCellColor(line,1,'url(evil)'));assert.equal(setCellColor('one | two',1,'blue'),'one | {bg:blue} two');
});
