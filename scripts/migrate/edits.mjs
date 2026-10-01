import fs from "node:fs";

// Each entry's `find` must match exactly once; applied after migrate.mjs regenerates
// content/posts/, so these are minimal, re-runnable fixes for sentences that only made
// sense next to media removed by processMedia() (see scripts/migrate/report.md).
export const edits = [
  {
    // "Highlights:" introduced a youtu.be link whose text was the bare URL, removed per rule 6.
    file: "content/posts/2014-02-12-2014-上海之夜视频/index.html",
    find: "<p><strong>集锦：</strong></p>\n",
    replace: "",
  },
  {
    // The post's last paragraph (a photo "below" this sentence) was removed with its dead link.
    file: "content/posts/2012-02-11-night-of-shanghai-2012-recaptured-in-picture/index.html",
    find: "Thanks everyone, and a special thank you for Lu Bin who took this great photo below!",
    replace: "Thanks everyone, and a special thank you for Lu Bin who took this great photo!",
  },
  {
    // The registration link's text was its own URL, removed per rule 6, leaving a bare ".".
    file: "content/posts/2011-02-20-the-12th-fudan-university-world-alumni-conference-invitation/index.html",
    find: "<p><strong>Registration and more details:</strong> .</p>",
    replace: "<p><strong>Registration and more details:</strong></p>",
  },
  // --- Fix round 2: inline "the <a> is its own URL/filename" removals left orphaned labels
  // or connector words in the surrounding sentence (R6/R10). Each entry below removes only
  // the now-orphaned label/connector, never invents content. See task-4-report.md "Fix round 2".
  {
    file: "content/posts/2018-08-22-test/index.html",
    find: "(408)614-7199, Website: </h4>",
    replace: "(408)614-7199</h4>",
  },
  {
    file: "content/posts/2018-08-22-test/index.html",
    find: "(650)269-3422, Website:</strong></h4>",
    replace: "(650)269-3422</strong></h4>",
  },
  {
    file: "content/posts/2018-08-22-test/index.html",
    find: "jennifer.sun@tfaconnect.com, Website: </strong></h4>",
    replace: "jennifer.sun@tfaconnect.com</strong></h4>",
  },
  {
    file: "content/posts/2018-01-21-2018上海之夜：上海老咪道-湾区上海高校美/index.html",
    find: "<p><strong>同济大学北加州校友会</strong> ()</p>",
    replace: "<p><strong>同济大学北加州校友会</strong></p>",
  },
  {
    file: "content/posts/2018-01-21-2018上海之夜：上海老咪道-湾区上海高校美/index.html",
    find: '<p class="p1">同济大学北加州校友会 TongJi University Alumni Association Northern California ()</p>',
    replace: '<p class="p1">同济大学北加州校友会 TongJi University Alumni Association Northern California</p>',
  },
  {
    file: "content/posts/2016-08-01-2015浦江之夏-上海七大高校联合夏季烧烤转载/index.html",
    find: "创始人，Website: ,  Tel:",
    replace: "创始人，Tel:",
  },
  {
    file: "content/posts/2016-08-01-2015浦江之夏-上海七大高校联合夏季烧烤转载/index.html",
    find: "Holly在加州, Website: </strong>",
    replace: "Holly在加州</strong>",
  },
  {
    file: "content/posts/2016-08-01-2015浦江之夏-上海七大高校联合夏季烧烤转载/index.html",
    find: "左邻右里买买买！ Website: </strong>",
    replace: "左邻右里买买买！</strong>",
  },
  {
    // Standalone "please register online:" paragraph pointing at a now-dead eventbrite link.
    file: "content/posts/2014-06-11-健康講座-（有关中医保健，转基因食物，抗癌药物/index.html",
    find: "<p>有兴趣者，请网上注册报名： </p>\n",
    replace: "",
  },
  {
    file: "content/posts/2014-05-15-高新区发展和招才引智的回顾和展望交流会/index.html",
    find: "<p>费用: 免费<br>\n报名： </p>\n",
    replace: "<p>费用: 免费</p>\n",
  },
  {
    // Three mitbbs links (each text = its own URL) removed from one paragraph left "详情："
    // (Details:) pointing at nothing, plus three now-empty <br> lines before the thank-you note.
    file: "content/posts/2013-03-14-关于向校友尹榆家人捐款的倡议书/index.html",
    find: "&nbsp;<br>\n详 情：</p>\n<p><br>\n<br>\n<br>\n&nbsp;<br>\n谢谢各位校友对尹榆家人的关心和帮助！<br>\n",
    replace: "</p>\n<p>谢谢各位校友对尹榆家人的关心和帮助！<br>\n",
  },
  {
    file: "content/posts/2013-01-15-night-of-shanghai-2013-上海之夜/index.html",
    find: "429-9956, </li>",
    replace: "429-9956</li>",
  },
  {
    file: "content/posts/2013-01-15-night-of-shanghai-2013-上海之夜/index.html",
    find: "398-4616, </li>",
    replace: "398-4616</li>",
  },
  {
    // Two "results:" labels (group stage, playoffs) each pointed at a now-dead pingpongmatch.com link.
    file: "content/posts/2012-10-28-衷心祝贺复旦队获得东方明珠杯第三名！/index.html",
    find: "<p>小组循环赛成绩： <br>\n淘汰赛成绩： <br>\n以下为来自队员和校友的部分祝贺：</p>\n",
    replace: "<p>以下为来自队员和校友的部分祝贺：</p>\n",
  },
  {
    // Standalone "Registration:" label/paragraph whose only content was the removed link.
    file: "content/posts/2012-07-07-cina-and-fudan-joint-event-finding-your-way-to-successful-entrepreneurship/index.html",
    find: "<p><strong>Registration</strong>:</p>\n",
    replace: "",
  },
  {
    file: "content/posts/2012-05-06-cina-and-fudan-joint-event-essential-elements-for-successfully-launching-a-new-venture/index.html",
    find: "<p><strong>Register</strong>:   .On-Site payment $5.00 addition<br>\n",
    replace: "<p>On-Site payment $5.00 addition<br>\n",
  },
  {
    // "the form below" no longer has a form below it (that paragraph was the removed link).
    file: "content/posts/2011-09-29-2012-fdaanc-board-member-nomination-and-election/index.html",
    find: "in the form below by the day",
    replace: "in the form by the day",
  },
  {
    file: "content/posts/2011-08-22-summer-of-pujiang-bbq-2011/index.html",
    find: "either Credit Card or Paypal:<br>\n</p>\n",
    replace: "either Credit Card or Paypal.</p>\n",
  },
  {
    // Standalone "see the new website:" paragraph pointing at a now-dead link.
    file: "content/posts/2011-03-16-world-alumni-conference-update/index.html",
    find: "<p>具体信息请参考新网址：</p>\n",
    replace: "",
  },
  {
    // Chinese sibling of the English "Registration and more details:" post above.
    file: "content/posts/2011-02-20-fudan-12th-world-alumni-conference/index.html",
    find: "有意参加次次会议的校友，请直接参考以下网站报名:  。报名截止日期:",
    replace: "有意参加次次会议的校友，报名截止日期:",
  },
  {
    // "Register here:" no longer has anything "here" — the link paragraph was removed.
    file: "content/posts/2011-02-19-night-of-shanghai-2011/index.html",
    find: "<p>Register here: (pay through SJTU-SV payment system to avoid processing fee)</p>\n",
    replace: "",
  },
  {
    file: "content/posts/2010-09-22-fudan-business-club-monthly-meeting-september-2010/index.html",
    find: "<p>Registration:  <br>\nFDAANC Board",
    replace: "<p>FDAANC Board",
  },
  {
    file: "content/posts/2010-09-09-fudan-alumni-association-opening-ceremony-shanghai/index.html",
    find: "<p>网上报名地址：</p>\n",
    replace: "",
  },
  {
    // repair-fudan-xianghui-hall has 5 inline-link removals left over from the Task 4 R6 pass.
    file: "content/posts/2010-08-26-repair-fudan-xianghui-hall/index.html",
    find: "相辉堂 （  ）（原名登辉堂",
    replace: "相辉堂（原名登辉堂",
  },
  {
    file: "content/posts/2010-08-26-repair-fudan-xianghui-hall/index.html",
    find: "<p>相辉堂保护修缮项目的正式网页为 。在北美的捐赠",
    replace: "<p>在北美的捐赠",
  },
  {
    file: "content/posts/2010-08-26-repair-fudan-xianghui-hall/index.html",
    find: "<p>The official web site for the project is<br>\n。</p>\n",
    replace: "",
  },
  {
    file: "content/posts/2010-08-26-repair-fudan-xianghui-hall/index.html",
    find: "<p>3) Donate Online : google checkout<br>\n<br>\n3.  Should I fill out a form when I donate?</p>\n",
    replace: "<p>3) Donate Online : google checkout<br>\n3.  Should I fill out a form when I donate?</p>\n",
  },
  {
    file: "content/posts/2010-08-26-repair-fudan-xianghui-hall/index.html",
    find: "Please go to the  to choose and book your seat.",
    replace: "Please go to choose and book your seat.",
  },
  {
    file: "content/posts/2010-06-02-fudan-delegation-in-the-bay-area-june-2010/index.html",
    find: "please go to to pre-register",
    replace: "please go to pre-register",
  },
  {
    file: "content/posts/2010-03-05-longfeifei-youth-summer-camp-fdfz-2010-shanghai/index.html",
    find: "<p>Please go to longfeifei websit for detail: </p>\n",
    replace: "",
  },
  {
    // "the following online form" — the form paragraph that followed was removed in its own right
    file: "content/posts/2013-10-14-fdaanc-board-election-for-2014-2015/index.html",
    find: "please complete the following online form by October 20, 2013",
    replace: "please complete the online form by October 20, 2013",
  },
];

export function applyEdits() {
  for (const { file, find, replace } of edits) {
    const text = fs.readFileSync(file, "utf8");
    const count = text.split(find).length - 1;
    if (count !== 1) throw new Error(`edits.mjs: "${find}" matched ${count} times in ${file}, expected 1`);
    fs.writeFileSync(file, text.replace(find, replace));
  }
}
