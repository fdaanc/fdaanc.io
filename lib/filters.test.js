import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ymdPath,
  longDate,
  stripTags,
  hasMore,
  beforeMore,
  moreLink,
  absolutize,
  url_encode_path,
  firstPdf,
} from "./filters.js";

// Front matter `date: 2026-08-17` parses as UTC midnight. Local-time formatting
// would print Aug 16 on a Pacific machine, so everything must use UTC.
test("ymdPath uses UTC so a date-only value never shifts a day", () => {
  assert.equal(ymdPath(new Date("2026-08-17")), "2026/08/17");
  assert.equal(ymdPath(new Date("2005-02-01T00:00:00Z")), "2005/02/01");
});

test("longDate matches the old site's format", () => {
  assert.equal(longDate(new Date("2026-08-17")), "August 17, 2026");
  assert.equal(longDate(new Date("2011-02-09")), "February 9, 2011");
});

test("stripTags removes markup from titles for <title> and the feed", () => {
  assert.equal(
    stripTags("<strong>复旦大学北加州校友会2026届理事会成立</strong>"),
    "复旦大学北加州校友会2026届理事会成立",
  );
});

test("beforeMore cuts at the read-more marker paragraph", () => {
  const html = '<p>a</p>\n<p><span id="more"></span></p>\n<p>b</p>';
  assert.equal(hasMore(html), true);
  assert.equal(beforeMore(html), "<p>a</p>\n");
  assert.equal(hasMore("<p>a</p>"), false);
});

// The old site also wraps the moved span in markup, e.g. "<p><strong><span id="more">...
// More information:</strong></p>" -- the marker isn't always alone in its paragraph.
test("beforeMore and moreLink handle a more marker sharing its paragraph with other content", () => {
  const html =
    '<p>a</p>\n<p><strong><span id="more"></span>More information:</strong></p>\n<p>b</p>';
  assert.equal(hasMore(html), true);
  assert.equal(beforeMore(html), "<p>a</p>\n");
  assert.equal(
    moreLink(html, "/2011/09/29/x/"),
    '<p><strong> <a href="/2011/09/29/x/#more" class="more-link">Continue Reading</a></strong></p>',
  );
});

test("moreLink reproduces the bare-marker form's plain Continue Reading paragraph", () => {
  const html = '<p>a</p>\n<p><span id="more"></span></p>\n<p>b</p>';
  assert.equal(
    moreLink(html, "/2012/02/11/x/"),
    '<p> <a href="/2012/02/11/x/#more" class="more-link">Continue Reading</a></p>',
  );
});

// Posts link attachments by bare filename; on the home page that must point into the post's folder.
test("absolutize prefixes relative src/href/data with the post URL, both quote styles", () => {
  const base = "/2026/08/17/x/";
  assert.equal(
    absolutize(
      '<a href="a.pdf"><img src=\'b.jpg\'></a><object data="a.pdf">',
      base,
    ),
    '<a href="/2026/08/17/x/a.pdf"><img src=\'/2026/08/17/x/b.jpg\'></a><object data="/2026/08/17/x/a.pdf">',
  );
});

test("absolutize leaves absolute, protocol, mailto and anchor links alone", () => {
  const html =
    '<a href="/y/">1</a><a href="https://e.com">2</a><a href="mailto:info@fdaanc.org">3</a><a href="#more">4</a>';
  assert.equal(absolutize(html, "/x/"), html);
});

test("absolutize does not rewrite src inside a data-src attribute", () => {
  const base = "/2026/08/17/x/";
  assert.equal(
    absolutize('<img data-src="a.jpg" src="b.jpg">', base),
    `<img data-src="a.jpg" src="${base}b.jpg">`,
  );
});

// Sitemap <loc> values must be valid XML/URLs; Chinese-slug post URLs contain raw
// non-ASCII characters that need percent-encoding.
test("url_encode_path percent-encodes non-ASCII URL segments", () => {
  assert.equal(
    url_encode_path("/2013/03/28/北加州/"),
    "/2013/03/28/%E5%8C%97%E5%8A%A0%E5%B7%9E/",
  );
  assert.equal(url_encode_path("/2026/08/17/bylaw/"), "/2026/08/17/bylaw/");
});

test("firstPdf picks the alphabetically first PDF next to the post", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "p-"));
  fs.writeFileSync(path.join(d, "b.pdf"), "");
  fs.writeFileSync(path.join(d, "a.pdf"), "");
  fs.writeFileSync(path.join(d, "index.md"), "");
  assert.equal(firstPdf(path.join(d, "index.md")), "a.pdf");
});
