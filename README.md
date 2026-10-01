# fdaanc.io

Source for [www.fdaanc.org](https://www.fdaanc.org/) (复旦大学北加州校友会 / Fudan Alumni
Association of Northern California), an [Eleventy](https://www.11ty.dev/) static site
hosted on GitHub Pages.

## Editors/authors

To add a post, create a new folder under `content/posts/` named
`YYYY-MM-DD-a-short-slug` and add an `index.md` file inside it:

```md
---
title: "Your post title"
date: 2026-09-30
---
Your post text goes here. You can use **bold**, *italic*, and
[links](https://example.com).
```

The post's URL is `/YYYY/MM/DD/a-short-slug/`, taken from the folder name. To
use a different URL slug than the folder name, add `slug: your-slug` to the
front matter.

To attach a PDF or image, drop the file in the same folder and link to it by
its bare filename:

```md
See the attached [agenda](agenda.pdf).

![Photo from the event](photo.jpg)
```

To embed a PDF inline (viewable without downloading), copy this block and
point `data`/`href` at your PDF's filename:

```html
<div class="fd-block-file"><object class="fd-block-file__embed" data="your-file.pdf" type="application/pdf" style="width:100%;height:600px"></object> <a href="your-file.pdf">your-file.pdf</a></div>
```

Save your changes (or open a pull request) on GitHub; the site rebuilds and
deploys automatically.

## Developers

```sh
npm install
npm start   # serve locally with live reload
npm run build   # write the static site to _site/
```

Project layout:

- `content/` — pages and `content/posts/` (one folder per post)
- `_includes/` — layout templates (header, sidebar, footer, post list, …)
- `_data/site.yml` — site title, slogan, sponsors, WeChat ID, subscribe links
- `assets/` — CSS, fonts, images, `assets/js/nav.js`
- `eleventy.config.js` — collections, permalinks, passthrough copy, filters

`npm run check` builds and runs `scripts/check.mjs`, which fails on any
broken internal link or leftover reference to the site's old platform.
