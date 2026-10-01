import * as yaml from "js-yaml";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import * as f from "./lib/filters.js";

export default function (eleventyConfig) {
  // _data/site.yml needs this: Eleventy only parses JSON/JS data files by default.
  eleventyConfig.addDataExtension("yml", (contents) => yaml.load(contents));
  eleventyConfig.addPassthroughCopy({ assets: "assets", CNAME: "CNAME", ".nojekyll": ".nojekyll" });
  // Attachments sit next to each post and are copied next to its output page.
  eleventyConfig.addPassthroughCopy("content/posts/**/*.{pdf,jpg,jpeg,png,gif,webp,mp3}", { mode: "html-relative" });
  eleventyConfig.amendLibrary("md", (md) => md.disable("code"));
  for (const [name, fn] of Object.entries(f)) eleventyConfig.addFilter(name, fn);
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("content/posts/*/index.{md,html}").sort((a, b) => b.date - a.date));
  // Ascending order: the feed plugin's template does `reverse | head(limit)`, which expects oldest-first input.
  eleventyConfig.addCollection("postsByDate", (api) =>
    api.getFilteredByGlob("content/posts/*/index.{md,html}").sort((a, b) => a.date - b.date));
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom", outputPath: "/feed.xml",
    collection: { name: "postsByDate", limit: 20 },
    metadata: { language: "zh", title: "复旦大学北加州校友会", subtitle: "Fudan Alumni Association of Northern California (FDAANC)",
      base: "https://www.fdaanc.org/", author: { name: "复旦大学北加州校友会" } },
  });

  return {
    dir: { input: "content", includes: "../_includes", data: "../_data", output: "_site" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: false,
  };
}
