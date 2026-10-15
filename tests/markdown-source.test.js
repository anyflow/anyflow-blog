const test=require('node:test'),assert=require('node:assert/strict'),normalize=require('../lib/markdown-source');
test('bold conversion preserves punctuation boundaries and code literals',()=>{
 const s='<strong>normal bold</strong> and <strong>Orchestra(오케스트라)</strong>는.\n\n`<strong>code</strong>`\n\n```html\n<strong>example</strong>\n```';
 const r=normalize(s);assert.equal(r.bold,1);assert.match(r.source,/\*\*normal bold\*\*/);assert.match(r.source,/<strong>Orchestra/);assert.match(r.source,/`<strong>code<\/strong>`/);assert.match(r.source,/```html\n<strong>example/);
});
test('list separators removed without losing nested lists, paragraphs or code',()=>{
 const s='- a\n\n- b\n  - child\n\n  - child2\n\n  second paragraph\n\n  ```js\n  x\n\n  y\n  ```\n\n- c\n\n1. one\n\n1. two\n\n> - quote1\n>\n> - quote2';
 const r=normalize(s);assert.equal(r.blankLines,5);assert.match(r.source,/- a\n- b/);assert.match(r.source,/child2\n\n  second paragraph/);assert.match(r.source,/x\n\n  y/);assert.match(r.source,/1\. one\n1\. two/);assert.match(r.source,/> - quote1\n> - quote2/);assert.equal(normalize(r.source).source,r.source);
});
