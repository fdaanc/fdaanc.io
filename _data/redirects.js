const years = [2004, 2005, 2006, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2022, 2024, 2025, 2026];
const home = (from) => ({ from, to: "/" });

// /YYYY/MM/ month archives present in the old tree.
const months = [
  "2004/05", "2004/08", "2005/02", "2005/07", "2005/08", "2005/09", "2006/01", "2006/02",
  "2009/04", "2009/07", "2009/08", "2009/09", "2009/11",
  "2010/03", "2010/06", "2010/08", "2010/09", "2010/10",
  "2011/02", "2011/03", "2011/08", "2011/09",
  "2012/01", "2012/02", "2012/05", "2012/07", "2012/10",
  "2013/01", "2013/02", "2013/03", "2013/07", "2013/10",
  "2014/01", "2014/02", "2014/05", "2014/06", "2014/07", "2014/08",
  "2015/03", "2015/07", "2015/10",
  "2016/02", "2016/08",
  "2017/01", "2017/06", "2017/11",
  "2018/01", "2018/08",
  "2019/12",
  "2020/02",
  "2022/08",
  "2024/01",
  "2025/12",
  "2026/01", "2026/04", "2026/08", "2026/09",
];

// /YYYY/page/N/ archive pagination present in the old tree.
const yearPages = ["2010", "2011", "2012", "2013", "2014"];

// /YYYY/MM/DD/ day archives (a listing page, distinct from the post at that date).
const days = ["2010/08/26", "2012/05/06", "2012/07/07"];

export default [
  ...["announcements", "culture", "eduation", "events", "uncategorized"].map((c) => home(`/category/${c}/`)),
  ...["/category/announcements/page/2/", "/category/announcements/page/3/", "/category/announcements/page/4/", "/category/announcements/page/5/"].map(home),
  ...["/category/events/page/2/", "/category/events/page/3/", "/category/events/page/4/", "/category/events/page/5/", "/category/events/page/6/"].map(home),
  ...["/category/uncategorized/page/2/", "/category/uncategorized/page/3/", "/category/uncategorized/page/4/", "/category/uncategorized/page/5/"].map(home),
  ...["culture", "education"].map((t) => home(`/tag/${t}/`)),
  ...["eamin-zhang", "fdaanc", "gongqi"].map((a) => home(`/author/${a}/`)),
  ...Array.from({ length: 13 }, (_, i) => home(`/author/eamin-zhang/page/${i + 2}/`)),
  ...years.map((y) => home(`/${y}/`)),
  ...months.map((m) => home(`/${m}/`)),
  ...yearPages.map((y) => home(`/${y}/page/2/`)),
  ...days.map((d) => home(`/${d}/`)),
  { from: "/lyrics/", to: "/2013/03/28/北加州复旦大学校友会会歌的由来-徐敏子（新闻系/" },
  { from: "/fu-dan-music/", to: "/2013/03/28/北加州复旦大学校友会会歌的由来-徐敏子（新闻系/" },
  { from: "/fdaanc_donation_guide_2026/", to: "/2026/04/07/复旦北加州校友会配捐指南/FDAANC_Donation_Guide_2026.pdf" },
  { from: "/fdaanc-resolutions-wechat-group-liaison-conduct-20260126/", to: "/2026/01/29/复旦大学北加州校友会2026届理事会成立/FDAANC-resolutions-wechat-group-liaison-conduct-20260126.pdf" },
  { from: "/cropped-fdaanc_logo_blue_white_bg_550x550-png/", to: "/assets/img/logo.png" },
  { from: "/2026/08/17/复旦大学北加州校友会章程微调/bylaw-of-fdaanc-202608/", to: "/2026/08/17/复旦大学北加州校友会章程微调/Bylaw-of-FDAANC.202608.pdf" },
  // Attachment subpages whose file wasn't localized into the post folder redirect to the post itself.
  { from: "/2010/10/14/2010-winter-zhongguancun/附件二：12月创业人才中关村考察团汇总表/", to: "/2010/10/14/2010-winter-zhongguancun/" },
  { from: "/2011/02/20/fudan-12th-world-alumni-conference/第十二届复旦世联会国内校友报名办法/", to: "/2011/02/20/fudan-12th-world-alumni-conference/" },
  { from: "/2011/02/20/fudan-12th-world-alumni-conference/12thworldalumni_fdaancsponsorship/", to: "/2011/02/20/fudan-12th-world-alumni-conference/" },
  { from: "/2011/02/20/fudan-12th-world-alumni-conference/12thworldalumni_registration/", to: "/2011/02/20/fudan-12th-world-alumni-conference/" },
  { from: "/2011/02/20/the-12th-fudan-university-world-alumni-conference-invitation/12thworldalumni_fdaancsponsorship_en/", to: "/2011/02/20/the-12th-fudan-university-world-alumni-conference-invitation/" },
  { from: "/2011/09/13/中国海外人才招聘会/2011中国海外人才招聘大会_brochure/", to: "/2011/09/13/中国海外人才招聘会/" },
  { from: "/2011/09/13/中国海外人才招聘会/2011中国海外人才招聘大会/", to: "/2011/09/13/中国海外人才招聘会/" },
];
