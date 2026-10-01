import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SITE = "_site";
const fail = [];
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
const files = walk(SITE);

// R6: no trace of the old platform or the injected script, in output or source.
const BANNED = /wordpress|wp-|wp_|s\.w\.org|codes_iframe|ZG9jdW1lbnQ/i;
for (const f of files.filter((f) => /\.(html|css|js|xml|txt)$/.test(f)))
  if (BANNED.test(fs.readFileSync(f, "utf8")))
    fail.push(`banned string in ${f}`);
const src = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(
    (f) =>
      f &&
      !f.startsWith("scripts/") &&
      fs.existsSync(f) &&
      /\.(html|md|njk|js|css|yml|json|xml|txt)$/.test(f),
  );
for (const f of src)
  if (BANNED.test(fs.readFileSync(f, "utf8")))
    fail.push(`banned string in source ${f}`);

// R12: only our own script.
for (const f of files.filter((f) => f.endsWith(".html")))
  for (const m of fs
    .readFileSync(f, "utf8")
    .matchAll(/<script[^>]*src=["']([^"']+)/g))
    if (m[1] !== "/assets/js/nav.js")
      fail.push(`foreign script ${m[1]} in ${f}`);

// Internal links: every root-absolute or relative href/src/data must resolve to a file in _site.
for (const f of files.filter((f) => f.endsWith(".html"))) {
  const dir = "/" + path.relative(SITE, path.dirname(f));
  for (const m of fs
    .readFileSync(f, "utf8")
    .matchAll(/\b(?:href|src|data)=["']([^"'#?]+)/g)) {
    const u = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("//")) continue;
    const abs = decodeURI(u.startsWith("/") ? u : path.posix.join(dir, u));
    const target = path.join(
      SITE,
      abs.endsWith("/") ? abs + "index.html" : abs,
    );
    if (!fs.existsSync(target)) fail.push(`broken link ${u} in ${f}`);
  }
}
console.log(fail.length ? fail.join("\n") : `check ok (${files.length} files)`);
process.exit(fail.length ? 1 : 0);
