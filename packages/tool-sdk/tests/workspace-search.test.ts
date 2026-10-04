import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { searchWorkspace } from "../src/workspace-files.ts";

const makeWorkspace = (): string => {
  const dir = join(tmpdir(), `ws-search-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "app.ts"), "const alpha = 1;\n// TODO: fix alpha usage\n");
  writeFileSync(join(dir, "src", "readme.md"), "no match here\n");
  writeFileSync(join(dir, "app.ts"), "export { alpha } from './src/app';\n");
  writeFileSync(join(dir, "logo.png"), "binary-ish");
  return dir;
};

describe("searchWorkspace（IDE 面板检索）", () => {
  it("文件名与内容双重命中并带行号", () => {
    const root = makeWorkspace();
    try {
      const result = searchWorkspace(root, "alpha");
      // 内容命中：src/app.ts 两行、app.ts 一行；文件名命中：无（无 alpha 文件名）
      const contentMatches = result.matches.filter((match) => match.kind === "content");
      expect(contentMatches.length).toBe(3);
      // 不假设扫描顺序：按路径断言各文件的命中行
      const srcMatches = contentMatches.filter((match) => match.path === "src/app.ts");
      expect(srcMatches).toHaveLength(2);
      expect(srcMatches[0]).toMatchObject({ line: 1 });
      expect(srcMatches[1]).toMatchObject({ line: 2, text: expect.stringContaining("TODO") });
      expect(contentMatches.some((match) => match.path === "app.ts" && match.line === 1)).toBe(
        true,
      );
      expect(result.truncated).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("文件名命中", () => {
    const root = makeWorkspace();
    try {
      const result = searchWorkspace(root, "readme");
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toMatchObject({ path: "src/readme.md", kind: "filename" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("跳过 .git/node_modules 与二进制扩展名；空查询直接返回空", () => {
    const root = makeWorkspace();
    try {
      // .png 里的 "binary" 不参与内容匹配
      const pngResult = searchWorkspace(root, "binary-ish");
      expect(pngResult.matches).toHaveLength(0);
      // node_modules 下的文件不被扫描
      mkdirSync(join(root, "node_modules", "pkg"), { recursive: true });
      writeFileSync(join(root, "node_modules", "pkg", "index.js"), "const alpha = 2;\n");
      expect(
        searchWorkspace(root, "alpha").matches.every(
          (match) => !match.path.startsWith("node_modules"),
        ),
      ).toBe(true);
      expect(searchWorkspace(root, "  ").matches).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
