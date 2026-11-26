const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('nginx serves the static site without proxying comment requests',()=>{
 const nginx=fs.readFileSync('nginx.conf','utf8');
 assert.doesNotMatch(nginx,/proxy_pass|comments_backend/);
 assert.match(nginx,/try_files \$uri \$uri\/index\.html =404/);
});
