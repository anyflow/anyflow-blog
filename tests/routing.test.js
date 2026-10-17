const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),yaml=require('js-yaml');
test('blog route preserves API paths, hosts and rate-limit attachment while nginx serves static content',()=>{
 const route=yaml.load(fs.readFileSync('deployment/httproute.yaml','utf8'));
 const api=route.spec.rules.find(r=>r.matches.some(m=>m.path.type==='PathPrefix'&&m.path.value==='/api'));
 const web=route.spec.rules.find(r=>r.matches.some(m=>m.path.type==='PathPrefix'&&m.path.value==='/'));
 assert.deepEqual(api.backendRefs,[{name:'anyflow-blog-comments',port:80}]);
 assert.deepEqual(web.backendRefs,[{name:'anyflow-blog',port:80}]);
 const services=yaml.loadAll(fs.readFileSync('deployment/services.yaml','utf8'));
 const comments=services.find(s=>s.metadata.name==='anyflow-blog-comments');
 assert.deepEqual(comments.spec.ports,[{name:'http',port:80,targetPort:3000,protocol:'TCP'}]);
 assert.ok(!api.filters?.some(f=>f.type==='URLRewrite'));
 assert.deepEqual(route.spec.hostnames,['blog.anyflow.net','www.anyflow.net','anyflow.net']);
 const policy=yaml.load(fs.readFileSync('deployment/agentgatewaypolicy.yaml','utf8'));
 assert.ok(policy.spec.targetRefs.some(ref=>ref.kind==='HTTPRoute'&&ref.name===route.metadata.name));
 const nginx=fs.readFileSync('deployment/nginx.conf','utf8');
 assert.doesNotMatch(nginx,/proxy_pass|comments_backend/);
 assert.match(nginx,/try_files \$uri \$uri\/index\.html =404/);
});
