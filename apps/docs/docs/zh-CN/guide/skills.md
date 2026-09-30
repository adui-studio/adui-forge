---
title: Skills
---

# Skills

Skill 是高于 Tool 的可复用 Agent 能力：Markdown 指令注入选中它的 Agent
系统提示词，让同一模型在不同"操作手册"下工作。

## 生命周期

1. **创建**：Web「Skills」页新建（name / description / instructions），或从
   `FORGE_SKILLS_DIR` 目录导入 `<name>/SKILL.md`；
2. **注入**：编辑自定义 Agent 时勾选 Skill，保存后立即生效（无需重启）；
3. **导出**：任意 Skill 可导出为标准 `SKILL.md`，回写仓库形成双向闭环。

## 目录约定

```text
<skills-dir>/
└─ <skill-name>/
   └─ SKILL.md        # frontmatter（name / description）+ Markdown 指令正文
```

导入目录由服务端 `FORGE_SKILLS_DIR` 指定（不接受客户端路径）。

## 限制与路线

- 当前载体为 Instructions（纯指令文本）；Tools / Knowledge / Scripts 载体与
  版本化在规划中；
- **Skill Marketplace（市场）**为占位能力：按需共享 Skill 包、评分与分发——
  底层 schema 与导入导出已就绪，市场侧待后续版本。

分支重命名
