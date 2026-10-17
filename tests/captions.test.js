const test=require('node:test'),assert=require('node:assert/strict');
const markdown=require('markdown-it');
function render(text){return markdown({html:true}).use(require('../lib/obsidian-markdown')).render(text);}
test('explicit captions attach only to adjacent media; plain matching prose stays prose',()=>{
 assert.match(render('![Same](photo.png)\n\nSame'),/<\/figure>\s*<p>Same<\/p>/);
 for(const media of ['![Photo](photo.png)','![](voice.mp3)','![](clip.mp4)','![](doc.pdf)','```mermaid\ngraph TD; A-->B\n```','<iframe src="https://www.youtube.com/embed/abc"></iframe>','<video src="clip.mp4"></video>','<audio src="voice.mp3"></audio>','```cardlink\nurl: https://example.com\ntitle: Card\n```','[YouTube](https://youtu.be/yonRGtMDDH8)']){
  const html=render(media+'\n\n> [!caption]\n> Caption **bold** with [source](https://example.com).\n>\n> Another paragraph.');
  assert.match(html,/<figure[\s\S]*<figcaption class="caption">[\s\S]*<strong>bold<\/strong>[\s\S]*Another paragraph\.[\s\S]*<\/figcaption><\/figure>/,media);
  assert.doesNotMatch(html,/callout-icon|callout-title/);
 }
 for(const prefix of ['', 'Text.\n\n', '![Photo](p.png)\n\nIntervening text.\n\n','```js\nx()\n```\n\n'])assert.match(render(prefix+'> [!caption]\n> Standalone'),/<div class="caption"><p>Standalone<\/p>\s*<\/div>/);
});
test('Mermaid anchors survive caption attachment; nested columns keep their own captions',()=>{
 const md=markdown({html:true}).use(require('../lib/obsidian-markdown'));let id;
 md.renderer.rules.fence=(tokens,i)=>{id=tokens[i].meta?.blockId;return '<pre class="mermaid">diagram</pre>';};
 const html=md.render('```mermaid\ngraph TD; A-->B\n```\n\n^diagram\n\n> [!caption]\n> Diagram.');
 assert.equal(id,'diagram');assert.match(html,/id="diagram"[\s\S]*<figure[\s\S]*<figcaption/);
 assert.match(render('> [!columns]\n>\n> > [!column|0.5]\n> >\n> > ![A](a.png)\n> >\n> > > [!caption]\n> > > A caption\n>\n> > [!column|0.5]\n> >\n> > > [!caption]\n> > > Standalone'),/<figcaption class="caption">[\s\S]*A caption[\s\S]*<\/figure>[\s\S]*<div class="caption">[\s\S]*Standalone/);
});

test('tabs and code indentation after quote markers still recognize explicit captions',()=>{
 const media='```mermaid\ngraph TD; A-->B\n```\n';
 for(const indent of ['\t',' \t','    ','\t\t']){
  const caption='> '+indent+'[!caption]\n> '+indent+'Caption **bold** with [link](https://example.com).';
  assert.match(render(media+caption),/<figure[\s\S]*<figcaption class="caption"><p>\s*Caption <strong>bold<\/strong>[\s\S]*<\/figcaption><\/figure>/);
  assert.match(render(caption),/<div class="caption"><p>\s*Caption <strong>bold<\/strong>/);
 }
 assert.match(render('>     plain code'),/<blockquote>\s*<pre><code>plain code/);
 assert.match(render('```md\n> \t[!caption]\n> \tExample\n```'),/<pre><code[^>]*>&gt;/);
});
