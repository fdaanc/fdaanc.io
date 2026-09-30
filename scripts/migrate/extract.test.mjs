import { test } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio";
import { stripMalware, renameWp, markMore, frontMatter, sameDayOrder } from "./extract.mjs";

test("stripMalware removes the injected loader and nothing else", () => {
  const html = '<p>文字 <!--codes_iframe--><script>var src="data:..."</script><!--/codes_iframe--></p>';
  assert.equal(stripMalware(html), "<p>文字 </p>");
});

test("renameWp renames class, id and aria tokens but not URLs", () => {
  const $ = cheerio.load('<div class="wp-block-file x"><a id="wp-block-file--media-1" href="/wp-content/a.pdf" aria-describedby="wp-block-file--media-1">a</a></div>', null, false);
  renameWp($, $.root());
  assert.equal($.html(), '<div class="fd-block-file x"><a id="fd-block-file--media-1" href="/wp-content/a.pdf" aria-describedby="fd-block-file--media-1">a</a></div>');
});

test("markMore normalizes the read-more anchor id", () => {
  const $ = cheerio.load('<p><span id="more-321"></span></p>', null, false);
  markMore($, $.root());
  assert.equal($.html(), '<p><span id="more"></span></p>');
});

test("frontMatter quotes titles safely, including colons and HTML", () => {
  assert.equal(frontMatter({ title: "2018上海之夜：<strong>x</strong>", date: "2018-01-21" }),
    '---\ntitle: "2018上海之夜：<strong>x</strong>"\ndate: 2018-01-21\n---\n');
});

test("sameDayOrder gives same-day posts descending times in old listing order", () => {
  const m = sameDayOrder([
    { path: "/a/", date: "2011-02-20" }, { path: "/b/", date: "2011-02-20" }, { path: "/c/", date: "2011-02-19" },
  ]);
  assert.equal(m.get("/a/"), "2011-02-20T12:00:00Z");
  assert.equal(m.get("/b/"), "2011-02-20T11:00:00Z");
  assert.equal(m.get("/c/"), "2011-02-19");
});
