import { ymdPath } from "../../lib/filters.js";

// Not `d.slug ?? ...` inside the "slug" computed itself: a computed property that
// self-references its own name confuses Eleventy's computed-dependency graph, so a
// sibling computed (permalink) reading d.slug back can see a stale "" for every post.
// Both computed entries call this directly on the raw front-matter proxy instead.
const effectiveSlug = (d) =>
  d.slug ?? d.page.filePathStem.split("/").at(-2).replace(/^\d{4}-\d{2}-\d{2}-/, "").trim().replace(/\s+/g, "-");

export default {
  layout: "post.njk",
  wrapperClass: "content-wrapper post-content single-content cf",
  articleClass: "content cf",
  eleventyComputed: {
    pageTitle: (d) => `${d.title} – 复旦大学北加州校友会`,
    resolvedSlug: effectiveSlug,
    permalink: (d) => `/${ymdPath(d.page.date)}/${effectiveSlug(d)}/`,
  },
};
