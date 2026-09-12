import { Module } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma-client";
import { ConversationService } from "./conversation.service";
import {
  CONVERSATION_STORE,
  InMemoryConversationStore,
  PrismaConversationStore,
} from "./conversation.store";
import { ConversationsController } from "./conversations.controller";

/** Chat 会话模块：配置 DATABASE_URL 时 PostgreSQL 持久化，否则内存降级（显式、不静默）。 */
@Module({
  controllers: [ConversationsController],
  providers: [
    {
      provide: CONVERSATION_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaConversationStore(new PrismaClient())
          : new InMemoryConversationStore(),
    },
    ConversationService,
  ],
})
export class ConversationsModule {}
