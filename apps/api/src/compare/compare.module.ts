import { Module } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma-client";
import { RunsModule } from "../runs/runs.module";
import { ComparisonService } from "./comparison.service";
import {
  COMPARISON_STORE,
  InMemoryComparisonStore,
  PrismaComparisonStore,
} from "./comparison.store";
import { ComparisonsController } from "./comparisons.controller";

/** 对比批次模块：配置 DATABASE_URL 时 PostgreSQL 持久化，否则内存降级（显式、不静默）。 */
@Module({
  imports: [RunsModule],
  controllers: [ComparisonsController],
  providers: [
    {
      provide: COMPARISON_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaComparisonStore(new PrismaClient())
          : new InMemoryComparisonStore(),
    },
    ComparisonService,
  ],
})
export class CompareModule {}
