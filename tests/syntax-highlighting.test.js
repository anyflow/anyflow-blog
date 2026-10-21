const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const highlight=require('../src/js/vendor/highlight.min.js');
test('all bundled language grammars load and safely highlight code',()=>{
 const languages=highlight.listLanguages();assert(languages.includes('yaml'));assert(languages.length>=36);
 for(const language of languages){const result=highlight.highlight('const value = 42;\n# comment\nkey: "text"\n<script>alert(1)</script>',{language,ignoreIllegals:true});assert.equal(result.language,language);assert.doesNotMatch(result.value,/<script>/);}
});
test('representative grammars emit colored tokens and aliases resolve',()=>{
 const samples={yaml:'apiVersion: v1\nreplicas: 3\nenabled: true',javascript:'const value = "text";',json:'{"enabled":true}',python:'def hello():\n  return 42',bash:'echo "$HOME" # comment',sql:'SELECT name FROM users WHERE id = 1',xml:'<div class="a">text</div>',css:'.a { color: red; }',go:'package main\nfunc main() { println("hi") }'};
 for(const [language,source] of Object.entries(samples))assert.match(highlight.highlight(source,{language}).value,/class="hljs-/);
 assert(highlight.getLanguage('yml'));assert(highlight.getLanguage('js'));assert(highlight.getLanguage('py'));assert(highlight.getLanguage('html'));
 const css=fs.readFileSync(require.resolve('../src/css/style.css'),'utf8');for(const token of ['hljs-attr','hljs-keyword','hljs-string','hljs-number','hljs-literal','hljs-title','hljs-comment','hljs-meta'])assert(css.includes(token));
});
