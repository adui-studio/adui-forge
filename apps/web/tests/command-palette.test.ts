import { describe, expect, it } from "vite-plus/test";
import { filterCommands, type CommandItem } from "../src/lib/command-palette.ts";

const commands: CommandItem[] = [
  { id: "page-runs", category: "页面", label: "Runs", keywords: "runs 执行 记录", run: () => {} },
  {
    id: "wf-review",
    category: "Workflow",
    label: "code-review-pipeline",
    hint: "评审流水线",
    keywords: "code-review-pipeline workflow",
    run: () => {},
  },
  {
    id: "run-1",
    category: "Run",
    label: "给用户列表增加搜索功能",
    keywords: "run_1 搜索",
    run: () => {},
  },
];

describe("filterCommands", () => {
  it("empty query returns all", () => {
    expect(filterCommands(commands, "")).toHaveLength(3);
    expect(filterCommands(commands, "  ")).toHaveLength(3);
  });

  it("matches label, hint and keywords case-insensitively", () => {
    expect(filterCommands(commands, "RUNS").map((c) => c.id)).toContain("page-runs");
    expect(filterCommands(commands, "评审").map((c) => c.id)).toEqual(["wf-review"]);
    expect(filterCommands(commands, "run_1").map((c) => c.id)).toEqual(["run-1"]);
  });

  it("returns empty for unmatched query", () => {
    expect(filterCommands(commands, "zzz")).toHaveLength(0);
  });
});
