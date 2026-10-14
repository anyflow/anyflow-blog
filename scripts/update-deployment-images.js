const fs = require('node:fs');
const assert = require('node:assert/strict');

function updateImages(text, siteDigest, commentsDigest = '') {
  const images = {
    'anyflow-blog': ['ghcr.io/anyflow/anyflow-blog', siteDigest],
    'anyflow-blog-comments': ['ghcr.io/anyflow/anyflow-blog-comments', commentsDigest],
  };
  for (const [name, [image, digest]] of Object.entries(images)) {
    if (!digest) continue;
    assert.match(digest, /^sha256:[a-f0-9]{64}$/);
    let count = 0;
    text = text.split(/^---\s*$/m).map(doc => {
      if (!new RegExp('^metadata:\\n  name: ' + name + '\\s*$', 'm').test(doc)) return doc;
      return doc.replace(/^(\s+image:)\s+\S+\s*$/m, (_, prefix) => {
        count++;
        return prefix + ' ' + image + '@' + digest;
      });
    }).join('---');
    assert.equal(count, 1, 'Expected exactly one image for ' + name);
  }
  return text;
}

if (require.main === module) {
  const file = 'deployment/deployments.yaml';
  assert.ok(process.env.SITE_DIGEST, 'SITE_DIGEST is required');
  fs.writeFileSync(file, updateImages(fs.readFileSync(file, 'utf8'),
    process.env.SITE_DIGEST, process.env.COMMENTS_DIGEST));
}
module.exports = { updateImages };
