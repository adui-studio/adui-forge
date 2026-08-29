import { Controller, Get, Inject } from "@nestjs/common";
import { AgentRegistry } from "@adui-forge/agent";

@Controller("agents")
export class AgentsController {
  constructor(@Inject(AgentRegistry) private readonly agents: AgentRegistry) {}

  @Get()
  list() {
    return this.agents.list().map((agent) => ({
      name: agent.name,
      description: agent.description,
      tools: agent.tools.map((tool) => tool.name),
    }));
  }
}
