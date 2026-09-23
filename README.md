# fdaanc.io

Static copy of [www.fdaanc.org](https://www.fdaanc.org/) (复旦大学北加州校友会 /
Fudan Alumni Association of Northern California), migrated off WordPress to
GitHub Pages on 2026-09-23.

The site is plain HTML served as-is (`.nojekyll`). Every page is the HTML
WordPress rendered, with the same markup, theme (Minimize by Slocum Studio, GPL)
and assets. Only links were changed:

- Links to the site are relative, so the site works both at a custom domain
  root and at `https://fdaanc.github.io/fdaanc.io/`.
- Pagination moved from `?paged=N` to `page/N/`.
- `<link>` tags for WordPress-only services (REST API, XML-RPC, RSS feeds,
  oEmbed, shortlinks) were removed from `<head>`.
- A small inline script forwards old query-style URLs (`/?p=123`, `?paged=2`,
  `?cat=4`, `?m=201202`, …) to their static pages, so old shared links keep
  working.

## What does not carry over

These depended on WordPress running a server, and a static host can't provide them:

- **Comments / login.** Comments were already closed site-wide. The
  "You must be logged in" link still points at `wp-login.php`, which is gone
  once DNS moves.
- **RSS feeds** (`/feed/`).
- **Search.** The theme had no search box, so nothing visible is lost.

Links that were already broken on WordPress (old 2010–2017 uploads that are
missing from the server, and a few typo'd links in old posts) stay broken
here. `tools/verify.py --check-live` confirms each one also returns 404 on
the old site.

## Editing from now on

Edit the HTML directly. A new post means copying an existing post's
`index.html` into a new `YYYY/MM/DD/<slug>/` directory. Then add it to the top
of `index.html` and `page/*/`, and to its category and archive pages.

## Re-syncing from WordPress (only while the old site is still up)

```sh
wget --mirror --page-requisites --no-parent --restrict-file-names=nocontrol \
  --reject-regex '(/wp-admin/|/wp-login\.php|/xmlrpc\.php|/wp-json/|/feed/|replytocom=|/comments/feed|\?s=|/embed/|oembed|\+src\+)' \
  -e robots=off -U "Mozilla/5.0" --wait=0.2 -P mirror \
  https://www.fdaanc.org/ https://www.fdaanc.org/wp-sitemap.xml
# month/year archives (from the Archives dropdown), attachment pages and
# sitemaps are not reachable by plain links. Crawl them as a second pass
# with -r -nc -i <url-list>.
python3 tools/build.py mirror/www.fdaanc.org wp_ids.json 404_raw.html .
python3 tools/verify.py . mirror/www.fdaanc.org --check-live
```

`wp_ids.json` maps WordPress IDs to permalinks (from `/wp-json/wp/v2/{posts,media,categories,tags,users}`).
`404_raw.html` is the WordPress 404 page (fetch any missing URL).

## Moving www.fdaanc.org here

1. Repo **Settings → Pages → Custom domain**: `www.fdaanc.org` (this adds a
   `CNAME` file). Then tick **Enforce HTTPS** once the certificate is issued.
2. DNS: `www` CNAME → `fdaanc.github.io`. For the bare `fdaanc.org`, add
   A records for 185.199.108.153, 185.199.109.153, 185.199.110.153 and
   185.199.111.153.
3. Keep WordPress running until the new site is confirmed live, then shut it
   down.
