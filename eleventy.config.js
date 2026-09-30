import * as yaml from "js-yaml";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import * as f from "./lib/filters.js";

export default function (eleventyConfig) {
  // _data/site.yml needs this: Eleventy only parses JSON/JS data files by default.
  eleventyConfig.addDataExtension("yml", (contents) => yaml.load(contents));
  eleventyConfig.addPassthroughCopy({ assets: "assets", CNAME: "CNAME", ".nojekyll": ".nojekyll" });
  // Attachments sit next to each post and are copied next to its output page.
  // failOnError: false - pre-2018 posts can still reference old hotlinked media
  // Task 4 hasn't localized yet; a missing reference must not abort the whole build.
  eleventyConfig.addPassthroughCopy("content/posts/**/*.{pdf,jpg,jpeg,png,gif,webp,mp3}", { mode: "html-relative", failOnError: false });
  eleventyConfig.amendLibrary("md", (md) => md.disable("code"));
  for (const [name, fn] of Object.entries(f)) eleventyConfig.addFilter(name, fn);
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("content/posts/*/index.{md,html}").sort((a, b) => b.date - a.date));

  return {
    dir: { input: "content", includes: "../_includes", data: "../_data", output: "_site" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: false,
  };
}
