import type { Agent } from "./define.ts";

/** 按名称管理 Agent 定义；重名注册视为配置错误。 */
export class AgentRegistry {
  readonly #agents = new Map<string, Agent>();

  register(agent: Agent): void {
    if (this.#agents.has(agent.name)) {
      throw new Error(`agent already registered: "${agent.name}"`);
    }
    this.#agents.set(agent.name, agent);
  }

  get(name: string): Agent | undefined {
    return this.#agents.get(name);
  }

  resolve(name: string): Agent {
    const agent = this.#agents.get(name);
    if (agent === undefined) {
      throw new Error(`unknown agent: "${name}"`);
    }
    return agent;
  }

  list(): Agent[] {
    return [...this.#agents.values()];
  }

  /**
   * 自定义 Agent 的 upsert 语义：已存在时覆盖（AgentConfigService 编辑保存用）。
   * 与 register 的“重名视为配置错误”不同，upsert 面向运行时可变配置。
   */
  upsert(agent: Agent): void {
    this.#agents.set(agent.name, agent);
  }

  /** 删除自定义 Agent；返回是否确实存在过。 */
  remove(name: string): boolean {
    return this.#agents.delete(name);
  }
}
