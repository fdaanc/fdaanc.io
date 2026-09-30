import { test } from "node:test";
import assert from "node:assert/strict";
import { ymdPath, longDate, stripTags } from "./filters.js";

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
  assert.equal(stripTags("<strong>复旦大学北加州校友会2026届理事会成立</strong>"), "复旦大学北加州校友会2026届理事会成立");
});
