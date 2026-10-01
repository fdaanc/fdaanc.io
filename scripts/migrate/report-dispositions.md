# Migration dispositions

Hand-curated review notes for the migration, kept separate from `report.md` because
`migrate.mjs` regenerates `report.md` from scratch on every run and would otherwise
discard this file's content.

## Disposition of every "needs manual edit" line

The lines `report.md` generates are a fresh snapshot of `processMedia()`'s output (it runs
before `edits.mjs`, so that list always reflects the *pre-edit* state, even for cues already
fixed). This section is the authoritative record of what happened to each one — edited,
or reviewed and left alone — and supersedes any earlier claim that the removals left
nothing else to review.

| Post | Cue(s) | Disposition |
|---|---|---|
| /2018/08/22/test/ | 3x dangling "Website:" | **Edited** — dropped the orphaned ", Website:" / "Website:" label on each of the 3 lines |
| /2018/01/21/.../ | 2x dangling "()" | **Edited** — dropped the empty parens on both lines |
| /2017/11/28/.../ | goo.gl/forms URL | **No edit needed** — the link was the paragraph's only content; the whole paragraph is gone, nothing broken remains |
| /2016/08/01/.../ | 3x dangling "Website:" | **Edited** — same as the 2018/08/22 case |
| /2014/06/11/.../ | "有兴趣者，请网上注册报名：" | **Edited** — removed the whole dangling sentence |
| /2014/05/15/.../ | "报名：" after "费用: 免费" | **Edited** — removed the dangling "报名：" line |
| /2014/02/12/2014-上海之夜视频/ | "集锦："; youtu.be URL | **Edited** ("集锦：", fixed in Task 4's first pass) / **No edit needed** (the youtu.be paragraph was its only content and is gone entirely) |
| /2013/10/14/.../ | docs.google.com/forms URL | **Edited** — the referencing sentence said "the following online form"; removed the now-orphaned "following" |
| /2013/03/14/.../ | 3 near-identical lines (2 mitbbs URLs + the tail text) | **Edited** (one edit resolves all 3) — removed "详 情：" and the 3 now-empty `<br>` lines before the thank-you note |
| /2013/01/15/.../ | 惠敏博士 line; Grace Gu line; Lily Zhao line | **No edit needed** (惠敏博士: no trailing punctuation issue) / **Edited** (Grace Gu, Lily Zhao: dropped the trailing comma left by the removed link) |
| /2012/10/28/.../ | 2 "成绩：" labels | **Edited** (one edit resolves both) — removed both dangling "小组循环赛成绩：" / "淘汰赛成绩：" lines |
| /2012/07/07/.../ | "Registration:" | **Edited** — removed the standalone dangling paragraph |
| /2012/05/06/.../ | "Register: ." | **Edited** — removed the dangling "Register: ." label |
| /2012/02/11/night-of-shanghai-2012-recaptured-in-picture/ | "...took this great photo be[low]" | **Edited** (fixed in Task 4's first pass) — "below" removed, since the photo "below" it was removed too |
| /2011/09/29/.../ | spreadsheet/viewform URL | **No edit needed** for the cue's own (now-empty) paragraph — it was the link's sole content and is gone entirely. **Edited** the adjacent referencing sentence instead: "in the form below" → "in the form" (the form paragraph right after it was what got removed) |
| /2011/09/13/中国海外人才招聘会/ | "2011中国海外人才招聘大会" (the two unwrapped attachment names) | **No edit needed** — the two dead-upload links were unwrapped to plain text per rule 6 and now read as plain document-name labels; not a broken sentence |
| /2011/08/22/.../ | "...select either Credit Card or Paypal:" | **Edited** — dangling trailing colon changed to a period |
| /2011/03/16/.../ | "具体信息请参考新网址：" | **Edited** — removed the whole dangling sentence |
| /2011/02/20/the-12th-fudan-university-world-alumni-conference-invitation/ | "Registration and more details:" (x2, same spot) | **Edited** (fixed in Task 4's first pass) — trailing " ." dropped |
| /2011/02/20/fudan-12th-world-alumni-conference/ | "有意参加次次会议的校友，请直接参考以下网站报名: 。报名截止日期:..." | **Edited** — Chinese sibling of the post above; merged directly into "报名截止日期:" |
| /2011/02/19/night-of-shanghai-2011/ | sjtu-sv.com URL | **No edit needed** for the cue's own (now-empty) paragraph — gone entirely. **Edited** the adjacent "Register here: (pay through SJTU-SV...)" paragraph instead, since "here" pointed at the now-removed link |
| /2010/09/22/.../ | "Registration: FDAANC Board" | **Edited** — removed the dangling "Registration:" line; "FDAANC Board" signature kept |
| /2010/09/09/.../ | "网上报名地址：" | **Edited** — removed the whole dangling sentence |
| /2010/08/26/repair-fudan-xianghui-hall/ | 5 lines (2 empty-paren/dangling-sentence Chinese spots, "The official web site... 。", the "Donate Online" blank `<br>`, "Please go to the to choose") | **Edited, all 5** — see `edits.mjs` for the exact minimal fix per spot |
| /2010/06/02/.../ | "...is arranging the meeting between the Delegation and " | **Edited** — "please go to to pre-register" (duplicate "to") fixed |
| /2010/03/05/.../ | "Please go to longfeifei websit for detail:" | **Edited** — removed the whole dangling sentence |

Every other post in `report.md` either has no "needs manual edit" line (its removals
didn't leave a broken sentence) or is a bare `uncertain <url>` notice (rule 3: kept, not
removed — no edit applicable).

## PayPal "Buy Now"/"Add to Cart" button images localized (Task 5b)

`processMedia()` originally only localized `<img>`, `<source>`, `<object>` and `<a>` elements;
a WordPress PayPal button renders as `<input type="image" src="...">` and fell through
untouched, leaving these 12 posts still hotlinking `paypalobjects.com` live. Fixed by adding
`input[type="image"][src]` to the localize-or-remove element loop — all 12 resolved "live"
and were downloaded into their own post folder, no manual edit needed:

- /2018/08/22/test/
- /2018/01/21/2018上海之夜：上海老咪道-湾区上海高校美/
- /2017/06/26/浦江之夏欢迎你-2017-湾区上海高校联盟bbq/
- /2017/01/14/2017上海之夜-湾区上海高校新春联欢开始注册啦/
- /2016/08/01/2015浦江之夏-上海七大高校联合夏季烧烤转载/
- /2016/02/03/2016-上海之夜3月6日在fremont盛大举行/
- /2015/07/23/2015浦江之夏-上海七大高校联合夏季烧烤/
- /2014/07/20/2014-浦江之夏-上海七大高校联合夏季烧烤/
- /2014/01/17/2014-night-of-shanghai-open-for-registration/
- /2013/07/10/2013-浦江之夏-上海六大高校联合夏季烧烤/
- /2013/01/15/night-of-shanghai-2013-上海之夜/
- /2012/07/08/2012-shanghai-alumni-summer-bbq-open-for-registration/
- /2012/01/09/night-of-shanghai-2012/

## R6 grep, exactly as run

```
$ grep -rniE 'wp-content|wp-includes|s\.w\.org' content
(no output, exit 1)
```

Zero hits. (`fdaanc.org/` appears 5 times as literal **visible anchor text** — not an href
— across 3 posts; the hrefs themselves are already rewritten to root-relative paths and the
displayed URLs still resolve. Controller-ruled acceptable; see task-4-report.md Deviations.)
