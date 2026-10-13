#!/usr/bin/env node
/* Builds dist/linog_explainer.html: one standalone file with every script inlined and the
 * fonts embedded as base64 data URIs (no network access needed to view or render it). */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

function build(out = path.join(ROOT, 'dist', 'linog_explainer.html')) {
  let html = fs.readFileSync(path.join(ROOT, 'index.dev.html'), 'utf8');
  html = html.replace(/url\("(assets\/fonts\/[^"]+\.woff2)"\)/g, (_, p) => {
    const b64 = fs.readFileSync(path.join(ROOT, p)).toString('base64');
    return `url("data:font/woff2;base64,${b64}")`;
  });
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => {
    const code = fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script>/* ${p} */\n${code}\n</script>`;
  });
  html = html.replace('<!--FONTS-->', '').replace('<!--/FONTS-->', '');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return out;
}
module.exports = { build };
if (require.main === module) {
  const out = build(process.argv[2]);
  console.log(`built ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}
