#!/usr/bin/env node
// ─────────────────────────────────────
// Cache-busting build step: stamps every relative ES module import
// (`from "./file.js"`) across js/*.js, plus the entry <script> tag in
// index.html, with `?v=<version>` read from package.json.
//
// Why this exists: a version bump alone doesn't force browsers to
// re-fetch every module — each `import "./x.js"` is cached by the
// browser independently of the entry script tag. A query-string suffix
// that changes every release is the standard way to invalidate that
// cache deterministically, without relying on hosting-level
// cache-control headers (untested/unconfirmed for itch.io's static
// host, so not relied upon here).
//
// Deliberately run only as a build step against a COPY of the repo
// (see .github/workflows/deploy.yml), never against the checked-in
// source in js/ or index.html directly — local dev/testing stays on
// clean, unversioned import paths.
// ─────────────────────────────────────
const fs = require("fs");
const path = require("path");

const targetDir = process.argv[2];
if (!targetDir) {
  console.error("Usage: node scripts/stamp-versions.js <target-directory>");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const version = pkg.version;

const importRe = /(from\s+["'])(\.\/[^"']+\.js)(["'])/g;

function stampFile(filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  const stamped = src.replace(importRe, (_, pre, modPath, post) => `${pre}${modPath}?v=${version}${post}`);
  if (stamped !== src) fs.writeFileSync(filePath, stamped);
  return stamped !== src;
}

const jsDir = path.join(targetDir, "js");
let changedCount = 0;
for (const file of fs.readdirSync(jsDir)) {
  if (!file.endsWith(".js")) continue;
  if (stampFile(path.join(jsDir, file))) changedCount++;
}

const indexPath = path.join(targetDir, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const scriptRe = /(<script type="module" src="js\/main\.js)(")/;
if (scriptRe.test(html)) {
  html = html.replace(scriptRe, `$1?v=${version}$2`);
  fs.writeFileSync(indexPath, html);
  changedCount++;
}

console.log(`Stamped ?v=${version} onto ${changedCount} file(s) in ${targetDir}`);
