import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ConversationService } from "./conversation.service";

export const createConversationSchema = z.object({
  agentName: z.string().min(1).default("forge-dev"),
  title: z.string().max(200).default(""),
});

export const appendMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(100_000),
  runId: z.string().min(1).optional(),
  status: z.enum(["streaming", "completed", "failed", "cancelled"]).default("completed"),
  error: z.string().max(10_000).optional(),
  tools: z.array(z.string().max(200)).max(50).default([]),
});

@Controller("conversations")
export class ConversationsController {
  constructor(@Inject(ConversationService) private readonly conversations: ConversationService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createConversationSchema)) input: {
      agentName: string;
      title: string;
    },
  ) {
    return this.conversations.create(input);
  }

  @Get()
  list() {
    return this.conversations.listSummaries();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.conversations.get(id);
  }

  @Post(":id/messages")
  append(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(appendMessageSchema)) message: unknown,
  ) {
    return this.conversations.appendMessage(
      id,
      message as Parameters<ConversationService["appendMessage"]>[1],
    );
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.conversations.delete(id);
    return { ok: true };
  }
}
