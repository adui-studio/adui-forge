import type { Skill } from "@adui-forge/skill-sdk";

/**
 * 内置（随应用分发的）精选技能目录——Skill 市场第一阶段的载体（spec §36）：
 * 零网络依赖、无 SSRF 面，安装 = upsert 到 Skill 库。
 * 与 .agents/skills（仓库级开发流程）独立；内容面向平台 Agent 运行时。
 */
/** 内置技能的目录版本：内容变更时递增，供导入端判断覆盖策略。 */
export const BUNDLED_SKILLS_VERSION = 1;

export interface BundledSkill extends Skill {
  version: number;
}

export const BUNDLED_SKILLS: ReadonlyArray<BundledSkill> = [
  {
    name: "bug-fixing",
    description: "系统化修 Bug：先复现、找根因、补回归测试，再修复",
    instructions: [
      "## Bug Fixing Protocol",
      "",
      "1. **Reproduce**：先用最小步骤复现问题；无法复现的描述不下结论。",
      "2. **Root cause**：定位根因并说明证据链，禁止只对表象打补丁。",
      "3. **Regression test**：先写一个能抓住该 Bug 的失败测试。",
      "4. **Fix**：最小改动修复；禁止顺手重构无关代码。",
      "5. **Verify**：跑全量相关测试，确认新测试通过且无回归。",
    ].join("\n"),
    enabled: true,
    version: 1,
  },
  {
    name: "code-review",
    description: "代码评审清单：正确性、安全、边界、可读性逐项检查",
    instructions: [
      "## Code Review Protocol",
      "",
      "逐项检查并按严重度输出（P0 正确性 / P1 安全 / P2 边界 / P3 可读性）：",
      "",
      "- **正确性**：逻辑是否与需求一致；并发与竞态。",
      "- **安全**：注入（SQL/命令/路径）、Secret 泄露、未校验输入。",
      "- **边界**：空值、超长输入、错误处理是否吞异常。",
      "- **可读性**：命名、注释解释 Why 而非 What。",
      "",
      "输出格式：每条发现给出 `file:line`、问题、建议修复。禁止空泛评价。",
    ].join("\n"),
    enabled: true,
    version: 1,
  },
  {
    name: "test-writing",
    description: "测试编写规范：先想边界，行为驱动，断言消息可诊断",
    instructions: [
      "## Test Writing Protocol",
      "",
      "1. 每个用例只测一个行为；用例名描述行为而非方法名。",
      "2. 优先边界：空输入、极值、并发、失败路径——不只有 happy path。",
      "3. 断言带上下文消息，失败时能直接定位差异。",
      "4. 测试代码与产品代码同等质量：禁止复制粘贴堆积。",
      "5. 修改 Bug 必须伴随回归测试（见 bug-fixing skill）。",
    ].join("\n"),
    enabled: true,
    version: 1,
  },
  {
    name: "minimal-diff",
    description: "最小改动原则：只改任务需要的代码，保持现有风格",
    instructions: [
      "## Minimal Diff Protocol",
      "",
      "1. 动手前列出计划触碰的文件与原因；超出计划需说明理由。",
      "2. 不做顺手重构、不整仓格式化、不升级无关依赖。",
      "3. 每个修改点能回答：删了会怎样？如果不能回答，删掉该修改。",
      "4. 优先遵循目标文件既有风格，而非个人偏好。",
      "5. 完成后检查 diff：无调试代码、无 Secret、无意外删除。",
    ].join("\n"),
    enabled: true,
    version: 1,
  },
  {
    name: "api-design",
    description: "API 设计检查：输入校验、错误契约、权限、副作用显式化",
    instructions: [
      "## API Design Protocol",
      "",
      "新增或修改端点时逐项确认：",
      "",
      "- **Input**：Schema 校验（Zod），拒绝未知字段。",
      "- **Output**：统一错误契约，不泄露栈/内部路径/Secret。",
      "- **Permission**：认证与授权显式声明，默认拒绝。",
      "- **Side effects**：多状态修改必须事务化，不留部分成功。",
      "- **Naming**：事件 domain.action、URL kebab-case、与现有端点风格一致。",
    ].join("\n"),
    enabled: true,
    version: 1,
  },
] as const satisfies readonly BundledSkill[];
