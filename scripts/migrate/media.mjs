import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CACHE = "scripts/migrate/probe-cache.json";
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
export const report = [];
export const saveCache = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));

const UPLOAD = /^(?:(?:\.\.\/)+|https?:\/\/(?:www\.)?fdaanc\.org\/)wp-content\/uploads\/(.+?)(?:\?.*)?$/;
const OWN = /^(?:(?:\.\.\/)+|https?:\/\/(?:www\.)?fdaanc\.org\/)(?!wp-)(.*)$/;
const CUE = /(：|:|如下|见下|below)\s*$|照片|photo|视频|video|下载|download/i;
// cheerio is loaded with decodeEntities:false (body is copied verbatim), so an attribute
// value like href still holds raw "&#038;" text. A real browser decodes entities when it
// builds the DOM, so a selector used against the live old page must match the decoded form.
const decodeEntities = (v) => v
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
const esc = (v) => decodeEntities(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// Synchronous probe via a child process keeps processMedia synchronous and cheerio-friendly.
// gtimeout is belt-and-suspenders: a DNS lookup on this sandboxed network can hang well past
// curl's own -m, so a hard external kill bounds every probe to ~12s regardless.
function probe(url, isImg) {
  if (url in cache) return cache[url];
  let r;
  try {
    const out = execFileSync("gtimeout", ["12", "curl", "-sSL", "-A", "Mozilla/5.0", "-m", "10",
      "-o", "/dev/null", "-w", "%{http_code} %{content_type} %{url_effective}", url], { encoding: "utf8" });
    const [code, type, eff] = out.trim().split(" ");
    const c = Number(code);
    const rootLanding = new URL(eff).pathname === "/" && new URL(url).pathname !== "/";
    r = c === 404 || c === 410 || rootLanding || (isImg && c < 400 && !/^image\//.test(type)) ? "dead"
      : c >= 400 ? "uncertain" : "live";
  } catch { r = "dead"; }
  cache[url] = r;
  saveCache(); // persist incrementally: a probe run can take many minutes and may be interrupted
  return r;
}

function copyInto(dir, src, name) {
  let base = name, i = 1;
  while (fs.existsSync(path.join(dir, base))) base = name.replace(/(\.\w+)?$/, `-${++i}$1`);
  fs.copyFileSync(src, path.join(dir, base));
  return base;
}

export function processMedia({ $, root, postPath, dir, oldRoot, offline = false }) {
  const ops = { remove: [], unwrap: [], edited: null };
  const cues = [];

  const removeWithEmptyAncestors = (el) => {
    const chain = [el];
    let top = $(el);
    while (true) {
      const parent = top.parent();
      if (!parent.length || parent.is(root)) break;
      const rest = parent.contents().filter((_, n) => n !== top[0]);
      const empty = rest.toArray().every((n) => n.type === "text" ? !$(n).text().replace(/&nbsp;| /g, "").trim() : false);
      if (!empty && !parent.is(".wp-caption")) break;
      top = parent; chain.unshift(parent[0]);
    }
    const leaf = chain.at(-1), attr = leaf.attribs.src ? "src" : leaf.attribs.href ? "href" : "data";
    const attrVal = `[${attr}="${esc(leaf.attribs[attr] ?? "")}"]`;
    // A removed <a> with no text (its only content was the dead/missing media, or nothing at
    // all) can share its href with an unrelated sibling link that has real text — e.g. a
    // Picasa embed's thumbnail link and caption link, or a stray empty <a> duplicating a real
    // download link's href. Qualify by shape (img child, or :empty) so the old-DOM selector
    // only matches the no-text link, not a same-href text link elsewhere on the page. Inside
    // the outer chain's :has() an img child becomes a plain child combinator, since a :has()
    // nested inside another :has() is invalid CSS; standalone (chain.length 1, nothing to nest
    // in) it's fine as :has(img) directly, since attrSel there *is* the whole removed selector
    // and must still resolve to the <a> itself, not its img descendant. :empty needs no such
    // split since it's a plain pseudo-class, not :has(), so nesting it is always valid.
    const hasImgChild = attr === "href" && $(leaf).children("img").length > 0;
    const isEmpty = attr === "href" && $(leaf).contents().length === 0;
    const leafSel = hasImgChild ? (chain.length > 1 ? `${leaf.name}${attrVal} > img` : `${leaf.name}:has(img)${attrVal}`)
      : isEmpty ? `${leaf.name}:empty${attrVal}`
      : `${leaf.name}${attrVal}`;
    ops.remove.push(chain.length === 1 ? leafSel : `${chain[0].name}:has(> ${chain.slice(1, -1).map((n) => n.name).concat(leafSel).join(" > ")})`);
    const neighbor = top.prev().length ? top.prev() : top.next();
    top.remove();
    if (neighbor.length && CUE.test(neighbor.text())) cues.push(neighbor.text().trim().slice(0, 80));
  };

  const copied = new Map(); // source file -> already-copied basename, so a PDF/image linked
  // more than once in the same post (e.g. an <object> embed plus its own download button)
  // reuses one copy instead of getting a fresh "-2", "-3" duplicate per reference.
  const resolve = (value, isImg) => {
    const up = value.match(UPLOAD);
    if (up) {
      const file = path.join(oldRoot, "wp-content/uploads", decodeURI(up[1]));
      if (!fs.existsSync(file)) return { missing: true };
      if (!copied.has(file)) copied.set(file, copyInto(dir, file, path.basename(file)));
      return { local: copied.get(file) };
    }
    const own = value.match(OWN);
    if (own) return { rewrite: "/" + own[1] };
    if (/^https?:/.test(value) && !offline) {
      const state = probe(value, isImg);
      if (state === "uncertain") report.push(`- ${postPath}: uncertain ${value}`);
      if (state === "dead") return { missing: true };
      if (isImg && state === "live") {
        if (!copied.has(value)) {
          const tmp = path.join(dir, ".dl");
          execFileSync("curl", ["-sSL", "-A", "Mozilla/5.0", "-m", "30", "-o", tmp, value]);
          const name = path.basename(new URL(value).pathname) || "image.jpg";
          copied.set(value, copyInto(dir, tmp, name)); fs.rmSync(tmp);
        }
        return { local: copied.get(value) };
      }
    }
    return {};
  };

  root.find("img.wp-smiley, img.emoji").each((_, el) => $(el).replaceWith($(el).attr("alt") ?? ""));
  // srcset variants are separate files WordPress generated at other sizes; none were copied,
  // so drop the attribute and let the browser fall back to the (already-localized) src.
  root.find("img[srcset]").each((_, el) => { delete el.attribs.srcset; });
  root.find('embed[type="application/x-shockwave-flash"]').each((_, el) => removeWithEmptyAncestors(el));
  root.find('iframe[src^="http://www.youtube.com"]').each((_, el) => { el.attribs.src = el.attribs.src.replace(/^http:/, "https:"); });

  for (const [sel, attr] of [["img[src]", "src"], ["source[src]", "src"], ["object[data]", "data"], ["a[href]", "href"]]) {
    root.find(sel).each((_, el) => {
      if (!el.parent) return; // already removed with an ancestor
      const value = el.attribs[attr];
      const r = resolve(value, el.name === "img");
      if (r.local) el.attribs[attr] = r.local;
      else if (r.rewrite) el.attribs[attr] = r.rewrite;
      else if (r.missing) {
        if (el.name === "a") {
          const text = $(el).text().trim();
          if (!text || text === value || value.endsWith(text)) removeWithEmptyAncestors(el);
          else { ops.unwrap.push(`a[href="${esc(value)}"]`); $(el).replaceWith($(el).contents()); }
        } else if (el.name === "source") removeWithEmptyAncestors($(el).closest("audio")[0] ?? el);
        else removeWithEmptyAncestors(el);
      }
    });
  }
  // Removing a caption's image leaves its text orphaned: drop emptied captions whole.
  root.find(".wp-caption").each((_, el) => { if (!$(el).find("img").length) removeWithEmptyAncestors(el); });

  const n = ops.remove.length + ops.unwrap.length;
  if (n) report.push(`- ${postPath}: removed ${ops.remove.length}, unwrapped ${ops.unwrap.length}`);
  cues.forEach((c) => report.push(`  - **needs manual edit** near: "${c}"`));
  return ops;
}
