import { PrismaClient } from "../../generated/prisma-client";

export const CONVERSATION_STORE = Symbol("CONVERSATION_STORE");

/** 单条会话消息（与 web 端 ChatMessage 形状对齐；role=assistant 时可关联派生 Run）。 */
export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  runId?: string;
  status: "streaming" | "completed" | "failed" | "cancelled";
  error?: string;
  tools?: string[];
}

export interface ConversationRecord {
  id: string;
  title: string;
  agentName: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  agentName: string;
  messageCount: number;
  updatedAt?: string;
  createdAt: string;
}

export interface ConversationStore {
  create(record: ConversationRecord): Promise<ConversationRecord>;
  get(id: string): Promise<ConversationRecord | null>;
  list(): Promise<ConversationRecord[]>;
  /** 追加消息并刷新 updatedAt；返回更新后的记录。 */
  appendMessage(id: string, message: ConversationMessage): Promise<ConversationRecord | null>;
  /** 空标题会话在首条用户消息落库时补标题。 */
  ensureTitle(id: string, title: string): Promise<void>;
  /** 显式重命名会话。 */
  rename(id: string, title: string): Promise<ConversationRecord | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryConversationStore implements ConversationStore {
  readonly #conversations = new Map<string, ConversationRecord>();

  async create(record: ConversationRecord): Promise<ConversationRecord> {
    this.#conversations.set(record.id, record);
    return record;
  }

  async get(id: string): Promise<ConversationRecord | null> {
    return this.#conversations.get(id) ?? null;
  }

  async list(): Promise<ConversationRecord[]> {
    return [...this.#conversations.values()].sort((a, b) =>
      (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
    );
  }

  async appendMessage(
    id: string,
    message: ConversationMessage,
  ): Promise<ConversationRecord | null> {
    const record = this.#conversations.get(id);
    if (record === undefined) return null;
    record.messages.push(message);
    record.updatedAt = new Date().toISOString();
    return record;
  }

  async ensureTitle(id: string, title: string): Promise<void> {
    const record = this.#conversations.get(id);
    if (record !== undefined && record.title === "") {
      record.title = title;
    }
  }

  async rename(id: string, title: string): Promise<ConversationRecord | null> {
    const record = this.#conversations.get(id);
    if (record === undefined) return null;
    record.title = title;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  async delete(id: string): Promise<boolean> {
    return this.#conversations.delete(id);
  }
}

/** PostgreSQL 会话存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaConversationStore implements ConversationStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  #toRecord(row: {
    id: string;
    title: string;
    agentName: string;
    messages: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ConversationRecord {
    return {
      id: row.id,
      title: row.title,
      agentName: row.agentName,
      messages: Array.isArray(row.messages) ? (row.messages as ConversationMessage[]) : [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async create(record: ConversationRecord): Promise<ConversationRecord> {
    const row = await this.#prisma.conversation.create({
      data: {
        id: record.id,
        title: record.title,
        agentName: record.agentName,
        messages: JSON.parse(JSON.stringify(record.messages)),
      },
    });
    return this.#toRecord(row);
  }

  async get(id: string): Promise<ConversationRecord | null> {
    const row = await this.#prisma.conversation.findUnique({ where: { id } });
    return row === null ? null : this.#toRecord(row);
  }

  async list(): Promise<ConversationRecord[]> {
    const rows = await this.#prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => this.#toRecord(row));
  }

  async appendMessage(
    id: string,
    message: ConversationMessage,
  ): Promise<ConversationRecord | null> {
    const existing = await this.get(id);
    if (existing === null) return null;
    const row = await this.#prisma.conversation.update({
      where: { id },
      data: { messages: JSON.parse(JSON.stringify([...existing.messages, message])) },
    });
    return this.#toRecord(row);
  }

  async ensureTitle(id: string, title: string): Promise<void> {
    const existing = await this.get(id);
    if (existing !== null && existing.title === "") {
      await this.#prisma.conversation.update({ where: { id }, data: { title } });
    }
  }

  async rename(id: string, title: string): Promise<ConversationRecord | null> {
    const existing = await this.get(id);
    if (existing === null) return null;
    const row = await this.#prisma.conversation.update({
      where: { id },
      data: { title },
    });
    return this.#toRecord(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.#prisma.conversation.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
