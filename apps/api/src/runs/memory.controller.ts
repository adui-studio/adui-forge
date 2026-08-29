import { Controller, Get, Inject, Query } from "@nestjs/common";
import { MemoryService } from "./memory.service";

@Controller("memory")
export class MemoryController {
  constructor(@Inject(MemoryService) private readonly memory: MemoryService) {}

  @Get()
  recent(@Query("agent") agent: string = "forge-dev") {
    return this.memory.recent(agent, 10);
  }
}
