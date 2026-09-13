import { describe, expect, it } from "vite-plus/test";
import { AGENT_CONTEXT_MAX_CHARS, composeAgentTask } from "../src/lib/workspace.ts";

describe("composeAgentTask", () => {
  it("无上下文时原样返回用户输入", () => {
    expect(composeAgentTask("补充注释", null)).toBe("补充注释");
    expect(composeAgentTask("补充注释", { path: "a.ts", content: "" })).toBe("补充注释");
  });

  it("有上下文时追加当前文件路径与 fenced 内容", () => {
    const task = composeAgentTask("重构这个文件", {
      path: "src/main.ts",
      content: "console.log(1);\n",
    });
    expect(task.startsWith("重构这个文件")).toBe(true);
    expect(task).toContain("[Current file: src/main.ts]");
    expect(task).toContain("```");
    expect(task).toContain("console.log(1);");
  });

  it("超长文件内容截断并注明", () => {
    const task = composeAgentTask("分析", {
      path: "big.ts",
      content: "x".repeat(AGENT_CONTEXT_MAX_CHARS + 100),
    });
    expect(task).toContain("(truncated)");
    expect(task.length).toBeLessThan(AGENT_CONTEXT_MAX_CHARS + 200);
  });
});
