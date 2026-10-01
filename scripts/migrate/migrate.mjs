import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { stripMalware, renameWp, markMore, frontMatter, sameDayOrder } from "./extract.mjs";
import { processMedia, report, saveCache } from "./media.mjs";
import { applyEdits } from "./edits.mjs";

const OLD = path.resolve("../fdaanc-old");
const OUT = "content/posts";
const load = (html) => cheerio.load(html, { xml: { xmlMode: false, decodeEntities: false } });

// Old listing order (newest first) is the source of truth for ordering.
const order = [];
for (let n = 1; n <= 15; n++) {
  const f = n === 1 ? "index.html" : `page/${n}/index.html`;
  const $ = load(fs.readFileSync(path.join(OLD, f), "utf8"));
  $(".latest-post-title a").each((_, a) => order.push("/" + decodeURI($(a).attr("href").replace(/^(\.\.\/)*/, ""))));
}
if (order.length !== 71) throw new Error(`expected 71 posts, found ${order.length}`);

const posts = order.map((p) => {
  const [, y, m, d] = p.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return { path: p, date: `${y}-${m}-${d}` };
});
const dates = sameDayOrder(posts);
const ops = {};
for (const d of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (!d.endsWith(".js")) fs.rmSync(path.join(OUT, d), { recursive: true });

for (const { path: p, date } of posts) {
  const raw = stripMalware(fs.readFileSync(path.join(OLD, p, "index.html"), "utf8"));
  const $ = load(raw);
  const section = $("article.content > section.latest-post").first();
  const title = section.find("h1.post-title").html().trim();
  section.find(".post-title-wrap").remove();
  section.children("section.clear").last().remove();
  const slug = p.split("/").at(-2);
  const dir = path.join(OUT, `${date}-${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  ops[p] = processMedia({ $, root: section, postPath: p, dir, oldRoot: OLD }); // Task 4
  renameWp($, section);
  markMore($, section);
  const body = section.html().replace(/^[ \t]+/gm, "").trim() + "\n";
  fs.writeFileSync(path.join(dir, "index.html"), frontMatter({ title, date: dates.get(p) }) + body);
}
fs.writeFileSync("scripts/migrate/ops.json", JSON.stringify(ops, null, 2));
saveCache();
fs.writeFileSync("scripts/migrate/report.md", `# Migration report\n\n${report.join("\n")}\n`);
applyEdits();
console.log(`migrated ${posts.length} posts`);
