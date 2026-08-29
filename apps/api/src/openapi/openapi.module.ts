import { Module } from "@nestjs/common";
import { OpenapiController } from "./openapi.controller";

@Module({
  controllers: [OpenapiController],
})
export class OpenapiModule {}
