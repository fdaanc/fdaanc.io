import fs from "node:fs";

// Each entry's `find` must match exactly once; applied after migrate.mjs regenerates
// content/posts/, so these are minimal, re-runnable fixes for sentences that only made
// sense next to media removed by processMedia() (see scripts/migrate/report.md).
const edits = [
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
];

export function applyEdits() {
  for (const { file, find, replace } of edits) {
    const text = fs.readFileSync(file, "utf8");
    const count = text.split(find).length - 1;
    if (count !== 1) throw new Error(`edits.mjs: "${find}" matched ${count} times in ${file}, expected 1`);
    fs.writeFileSync(file, text.replace(find, replace));
  }
}
