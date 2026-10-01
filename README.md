# 复旦大学北加州校友会 website

Source for [www.fdaanc.org](https://www.fdaanc.org), the official site of the Fudan Alumni Association of Northern California. It's a static site built with [Eleventy](https://www.11ty.dev) and published to GitHub Pages on every change to `main`.

## For editors: add or edit a post

You need a GitHub account with write access to this repository. No software to install.

**Add a post**

1. Open [`content/posts`](content/posts) and click **Add file → Create new file**.
2. Name it `YYYY-MM-DD-short-name/index.md`, for example `2026-11-02-annual-meeting/index.md`. The date and short name become the address: `www.fdaanc.org/2026/11/02/annual-meeting/`.
3. Paste this template and fill it in:

   ```markdown
   ---
   title: 2026年年会通知
   date: 2026-11-02
   ---
   亲爱的校友们，

   正文写在这里。空一行开始新段落。

   [点击下载附件](notice.pdf)
   ```

4. Click **Commit changes**. The site updates in about a minute.

**Attach a PDF or image**

Open the post's folder, click **Add file → Upload files**, and drop the file in. Then link it by its file name only:

- Link: `[Bylaw (PDF)](bylaw-2026.pdf)`
- Image: `![Group photo](photo.jpg)`
- To show a PDF inline on the page, add `embed_pdf: true` under `date:` in the template. The first PDF in the folder is shown.

**Edit or delete a post:** open its `index.md` (or `index.html` for older posts), click the pencil icon or **⋯ → Delete file**, then commit.

Formatting reference: `**bold**`, `- list item`, `[link text](https://example.com)`, `## Heading`.

## For developers

```sh
npm install
npm start          # http://localhost:8080, live reload
npm test           # unit tests for template filters
npm run build      # writes _site/
npm run check      # link check, banned strings, script allowlist (also run in CI)
```

| Path | What it is |
|---|---|
| `content/posts/<date>-<name>/` | One post: `index.md` (older migrated posts use `index.html`) plus its attachments |
| `content/index.njk` | Home page and `/page/N/` (5 posts per page) |
| `content/404.njk`, `content/redirects.njk` | Not-found page; redirect pages for retired URLs |
| `_data/site.yml` | Site title, slogan and sidebar (sponsors, WeChat ID, subscribe links) |
| `_data/redirects.js` | Retired URL → new URL |
| `_includes/` | Page layout, header, sidebar, footer, post and listing templates |
| `assets/css/` | Styles: `blocks.css` (content blocks), `theme.css`, `theme-blue.css`, `fonts.css` |
| `assets/fonts/`, `assets/img/`, `assets/js/nav.js` | Self-hosted Open Sans, logo and icons, mobile menu toggle |
| `lib/filters.js` | Template filters (dates, excerpts, link rewriting) |
| `.github/workflows/deploy.yml` | Build, check and deploy on push to `main`; build and check on PRs |

Post front matter: `title` and `date` are required. `slug` overrides the URL name. `embed_pdf: true` embeds the first PDF. A post's URL is `/YYYY/MM/DD/<slug>/`; don't change the slug of a published post, because shared links would break.

Deployment uses GitHub Pages with source **GitHub Actions** (Settings → Pages). The custom domain is set by `CNAME`.
