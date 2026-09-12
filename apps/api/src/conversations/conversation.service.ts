import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  CONVERSATION_STORE,
  type ConversationMessage,
  type ConversationRecord,
  type ConversationStore,
  type ConversationSummary,
} from "./conversation.store";

/** Chat 会话服务：会话生命周期与消息追加；消息由客户端在事件流收尾时落库。 */
@Injectable()
export class ConversationService {
  constructor(@Inject(CONVERSATION_STORE) private readonly store: ConversationStore) {}

  async create(input: { agentName: string; title: string }): Promise<ConversationRecord> {
    return this.store.create({
      id: `conv_${globalThis.crypto.randomUUID()}`,
      title: input.title,
      agentName: input.agentName,
      messages: [],
      createdAt: new Date().toISOString(),
    });
  }

  async listSummaries(): Promise<ConversationSummary[]> {
    const records = await this.store.list();
    return records.map((record) => ({
      id: record.id,
      title: record.title,
      agentName: record.agentName,
      messageCount: record.messages.length,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async get(id: string): Promise<ConversationRecord> {
    const record = await this.store.get(id);
    if (record === null) {
      throw new NotFoundException(`unknown conversation: "${id}"`);
    }
    return record;
  }

  async appendMessage(id: string, message: ConversationMessage): Promise<ConversationRecord> {
    // 首条用户消息落库时用其文本（截断）补默认标题
    if (message.role === "user") {
      await this.store.ensureTitle(id, message.text.slice(0, 30));
    }
    const record = await this.store.appendMessage(id, message);
    if (record === null) {
      throw new NotFoundException(`unknown conversation: "${id}"`);
    }
    return record;
  }

  async rename(id: string, title: string): Promise<ConversationRecord> {
    const record = await this.store.rename(id, title);
    if (record === null) {
      throw new NotFoundException(`unknown conversation: "${id}"`);
    }
    return record;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.store.delete(id);
    if (!deleted) {
      throw new NotFoundException(`unknown conversation: "${id}"`);
    }
  }
}
