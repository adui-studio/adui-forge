import { describe, expect, it } from "vite-plus/test";
import { ConversationService } from "../src/conversations/conversation.service";
import { InMemoryConversationStore } from "../src/conversations/conversation.store";

describe("ConversationService", () => {
  it("创建会话 → 追加消息 → 摘要列表，首条用户消息补默认标题", async () => {
    const service = new ConversationService(new InMemoryConversationStore());
    const conversation = await service.create({ agentName: "forge-dev", title: "" });
    expect(conversation.messages).toEqual([]);

    await service.appendMessage(conversation.id, {
      role: "user",
      text: "帮我分析 runs 模块的代码结构并给出改进建议，尽量详细",
      status: "completed",
    });
    await service.appendMessage(conversation.id, {
      role: "assistant",
      text: "已完成分析",
      runId: "run_1",
      status: "completed",
      tools: ["read_file"],
    });

    const detail = await service.get(conversation.id);
    expect(detail.messages).toHaveLength(2);
    expect(detail.messages[1]?.runId).toBe("run_1");

    const summaries = await service.listSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.title).toBe(
      "帮我分析 runs 模块的代码结构并给出改进建议，尽量详细".slice(0, 30),
    );
    expect(summaries[0]?.messageCount).toBe(2);
  });

  it("未知会话 404；删除后不可再取", async () => {
    const service = new ConversationService(new InMemoryConversationStore());
    await expect(service.get("conv_none")).rejects.toThrow("unknown conversation");
    const conversation = await service.create({ agentName: "a", title: "t" });
    await service.delete(conversation.id);
    await expect(service.get(conversation.id)).rejects.toThrow("unknown conversation");
  });
});
