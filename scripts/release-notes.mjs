// 从 CHANGELOG.md 提取当前 tag 对应版本的段落，作为 GitHub Release 正文。
// 版本来源：GITHUB_REF_NAME（tag 推送时为 v<version>）；本地调试回退 package.json。
import { readFileSync } from "node:fs";

const tag = process.env.GITHUB_REF_NAME ?? "";
const version =
  tag !== "" ? tag.replace(/^v/, "") : JSON.parse(readFileSync("package.json", "utf8")).version;

const changelog = readFileSync("CHANGELOG.md", "utf8");
const heading = new RegExp(`^## ${version.replaceAll(".", "\\.")}(\\s|$)`, "m");
const start = changelog.search(heading);
if (start === -1) {
  console.error(`CHANGELOG.md 中未找到版本 ${version} 的段落`);
  process.exit(1);
}
const after = changelog.slice(start);
// 段落终止于下一个 `## ` 二级标题或文件尾
const nextIdx = after.indexOf("\n## ", 1);
process.stdout.write((nextIdx === -1 ? after : after.slice(0, nextIdx)).trimEnd() + "\n");
