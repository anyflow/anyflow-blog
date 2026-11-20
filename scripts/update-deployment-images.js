const fs = require('node:fs');
const assert = require('node:assert/strict');

function updateImages(text, siteVersion, commentsVersion = '') {
  const images = {
    'anyflow-blog': ['ghcr.io/anyflow/anyflow-blog', siteVersion],
    'anyflow-blog-comments': ['ghcr.io/anyflow/anyflow-blog-comments', commentsVersion],
  };
  for (const [name, [image, version]] of Object.entries(images)) {
    if (!version) continue;
    assert.match(version, /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/);
    let count = 0;
    text = text.split(/^---\s*$/m).map(doc => {
      if (!new RegExp('^metadata:\\n  name: ' + name + '\\s*$', 'm').test(doc)) return doc;
      assert.match(doc, /^    version: "[^"]+"$/m);
      doc = doc.replace(/^    version: "[^"]+"$/m, '    version: "' + version + '"');
      return doc.replace(/^(\s+image:)\s+\S+\s*$/m, (_, prefix) => {
        count++;
        return prefix + ' ' + image + ':' + version;
      });
    }).join('---');
    assert.equal(count, 1, 'Expected exactly one image for ' + name);
  }
  return text;
}

function updateDeployerImage(text, digest) {
  assert.match(digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(text, /kind: CronJob/);
  let count = 0;
  const result = text.replace(/^(\s+image:)\s+ghcr\.io\/anyflow\/anyflow-blog-deploy[:@]\S+\s*$/m, (_, prefix) => {
    count++;
    return prefix + ' ghcr.io/anyflow/anyflow-blog-deploy@' + digest;
  });
  assert.equal(count, 1, 'Expected one deployment tools image');
  return result;
}

if (require.main === module) {
  const file = 'deployment/deployments.yaml';
  fs.writeFileSync(file, updateImages(fs.readFileSync(file, 'utf8'),
    process.env.SITE_VERSION, process.env.COMMENTS_VERSION));
  if (process.env.DEPLOYER_DIGEST) {
    const cron = 'deployment/cronjob.yaml';
    fs.writeFileSync(cron, updateDeployerImage(fs.readFileSync(cron, 'utf8'), process.env.DEPLOYER_DIGEST));
  }
}
module.exports = { updateImages, updateDeployerImage };
