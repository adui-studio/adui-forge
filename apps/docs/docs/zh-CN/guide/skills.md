---
title: Skills
---

# Skills

Skill 是高于 Tool 的可复用 Agent 能力：Markdown 指令注入选中它的 Agent
系统提示词，让同一模型在不同"操作手册"下工作。

## 生命周期

1. **创建**：四种来源互通——
   - Web「Skills」页表单新建（name / description / instructions）；
   - **粘贴导入**：粘贴 `SKILL.md` 全文，服务端解析 frontmatter 并按 schema
     校验，同名冲突需勾选覆盖；
   - 从 `FORGE_SKILLS_DIR` 目录导入 `<name>/SKILL.md`；
   - **技能包导入**：选择 `.json` 技能包文件整批导入；
2. **注入**：编辑自定义 Agent 时勾选 Skill，保存后立即生效（无需重启）；
3. **使用统计**：已安装 Skill 卡片显示被多少个自定义 Agent 选中（悬停查看
   名单），作为受欢迎程度的代理指标；
4. **导出**：单个 Skill 导出为标准 `SKILL.md`；或整库导出为技能包 JSON，
   在不同安装之间迁移、分享给他人。

## 目录约定

```text
<skills-dir>/
└─ <skill-name>/
   └─ SKILL.md        # frontmatter（name / description）+ Markdown 指令正文
```

导入目录由服务端 `FORGE_SKILLS_DIR` 指定（不接受客户端路径）。

## Skill 市场

Skill 市场随应用内置一份精选技能目录（零网络依赖），支持：

- **一键安装**：目录内全部技能批量导入；
- **逐技能安装**：按需安装单个技能；
- **防覆盖保护**：用户已本地修改的同名技能不会被静默覆盖，需显式确认
  强制更新；
- **版本驱动更新提示**：内置目录版本化，本地版本落后时市场卡金色
  「有更新」高亮；同版本但内容不同标记「已修改」。

## 技能包（Bundle）

技能包是整库迁移与分享的载体：`{version, exportedAt, skills[]}` 结构的
JSON 文件（文件名 `adui-forge-skills-<日期>.json`）。导出保留内置技能的
版本号，接收方导入后更新链不中断；导入为显式还原语义，合法条目直接
覆盖同名 Skill，非法条目跳过并说明原因（单包上限 100 条）。

## 限制与路线

- 当前载体为 Instructions（纯指令文本）；Tools / Knowledge / Scripts 载体
  在规划中；
- 外部技能源（远程目录 / 在线分发）与评分体系待后续版本。
