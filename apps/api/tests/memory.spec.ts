import { describe, expect, it } from "vite-plus/test";
import { MemoryService } from "../src/runs/memory.service";

const recordInput = (task: string) => ({
  agentName: "forge-dev",
  task,
  status: "completed" as const,
  summary: `summary of ${task}`,
});

describe("MemoryService 管理（AGENTS §49）", () => {
  it("记录带稳定 id；单条删除生效，未知名返回 false", () => {
    const memory = new MemoryService();
    memory.record(recordInput("task-a"));
    memory.record(recordInput("task-b"));
    const [first] = memory.recent("forge-dev", 10);
    expect(first?.id).toMatch(/^mem_/);
    expect(memory.remove(first?.id ?? "")).toBe(true);
    expect(memory.recent("forge-dev", 10)).toHaveLength(1);
    expect(memory.remove("mem_missing")).toBe(false);
  });

  it("清空支持按 Agent 与全量", () => {
    const memory = new MemoryService();
    memory.record(recordInput("a1"));
    memory.record({ ...recordInput("a2"), agentName: "scout" });
    expect(memory.clear("forge-dev")).toBe(1);
    expect(memory.recent("forge-dev", 10)).toHaveLength(0);
    expect(memory.recent("scout", 10)).toHaveLength(1);
    expect(memory.clear()).toBe(1);
    expect(memory.list(undefined, 10)).toHaveLength(0);
  });

  it("停用后不记录且注入视图为空；重新启用后恢复", () => {
    const memory = new MemoryService();
    memory.record(recordInput("before"));
    memory.setEnabled(false);
    expect(memory.enabled).toBe(false);
    memory.record(recordInput("while-disabled"));
    expect(memory.recent("forge-dev", 10)).toEqual([]);
    expect(memory.list(undefined, 10)).toHaveLength(0);
    memory.setEnabled(true);
    // 停用前的记录保留，停用期间的未记录
    expect(memory.list(undefined, 10)).toHaveLength(1);
    expect(memory.list(undefined, 10)[0]?.task).toBe("before");
  });

  it("list 支持按 Agent 过滤且倒序", () => {
    const memory = new MemoryService();
    memory.record(recordInput("t1"));
    memory.record({ ...recordInput("t2"), agentName: "scout" });
    expect(memory.list(undefined, 10).map((record) => record.task)).toEqual(["t2", "t1"]);
    expect(memory.list("scout", 10)).toHaveLength(1);
  });
});
