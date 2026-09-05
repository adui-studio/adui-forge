# ADui Forge — UI/UX Design Guidelines

> Agent-Driven Development Platform  
> Web / Tauri Desktop / Flutter Mobile  
> Visual Design + Interaction Design Specification

---

# 1. 文档目的

本规范定义 ADui Forge 在以下客户端中的统一 UI/UX 标准：

```text
Web
├─ React
└─ Vite+

Desktop
├─ Tauri
├─ React
└─ Rust Native Layer

Mobile
└─ Flutter
```

覆盖：

```text
品牌视觉
主题系统
颜色
字体
布局
组件
导航
交互
动效
状态反馈
Agent Chat
Agent Run
Tool Call
MCP
Skill
Workflow
Diff
Terminal
Approval
Workspace
响应式
键盘操作
无障碍
错误处理
空状态
加载状态
多端一致性
```

该文档作为 ADui Forge UI/UX 的最高级设计约束。

---

# 2. 产品定位

ADui Forge 是：

> Agent-Driven Development Platform

其界面不应表现为传统后台管理系统。

禁止以以下产品作为主要视觉方向：

```text
ERP
CRM
OA
传统 Admin Dashboard
数据大屏
普通 AI Chatbot
```

整体产品形态应该是：

```text
Developer Tool
+
IDE Workspace
+
Agent Workspace
+
Task Center
+
Agent Control Center
```

---

# 3. 核心体验目标

ADui Forge 的 UX 必须让用户形成三个明确认知。

第一：

> 我正在使用一个专业的软件开发工具。

第二：

> Agent 正在真实参与我的软件工程过程。

第三：

> Agent 在做什么、为什么这么做、修改了什么，我始终知道并且可以控制。

---

# 4. 核心设计原则

统一遵循：

```text
Content First
Agent Visible
Developer in Control
Dense but Clear
Dark First
Keyboard First
Progressive Disclosure
Context Aware
Safe by Default
Cross-platform Consistency
```

---

# 5. Content First

内容永远比装饰重要。

开发者真正关注：

```text
Code
Task
Agent
Run
Tool
Diff
Terminal
Test
Trace
Git
Workflow
```

因此减少：

```text
巨大 Banner
大面积渐变
无意义插图
大量 Card
过大留白
复杂阴影
Glassmorphism
装饰性动画
```

---

# 6. Agent Visible

Agent 不能成为黑盒。

用户必须随时知道：

```text
哪个 Agent 在工作
当前 Run 是什么
当前处于什么阶段
正在读取什么
正在修改什么
正在调用什么 Tool
正在执行什么命令
测试是否成功
是否需要 Approval
是否失败
最终修改了什么
```

---

# 7. Developer in Control

任何时候开发者拥有最终控制权。

运行中的 Agent 应支持：

```text
Pause
Resume
Stop
Cancel
Retry
```

结果应支持：

```text
Review
View Diff
Accept
Reject
Rollback
Retry
Fork
Commit
```

敏感操作支持：

```text
Approve
Reject
```

---

# 8. Progressive Disclosure

默认界面只展示最重要的信息。

例如 Tool Call：

默认：

```text
✓ Read 4 files
✓ Search AuthService
● Running tests
```

需要时再展开：

```text
Input
Output
Command
Duration
Exit Code
Raw Log
```

简单用户可以只关注：

```text
Task → Agent → Result
```

高级用户可以查看：

```text
Context
Tool
MCP
Trace
Token
Prompt
Workflow
```

---

# 9. 品牌视觉

品牌：

# ADui Forge

品牌视觉直接继承 ADui Logo。

Logo 原始核心色：

```text
ADui Purple
#5B2B82

ADui Lime
#6CFF00
```

品牌关系：

```text
Purple = Forge

Lime = Agent
```

对应语义：

```text
#5B2B82
Engineering
Platform
Control
Structure
Brand

#6CFF00
Agent
Intelligence
Execution
Active
Energy
```

---

# 10. 品牌视觉公式

整个产品遵循：

```text
90% Neutral
+
8~15% Purple
+
1~3% Lime
```

即：

> Neutral 构建工作空间，Purple 建立品牌结构，Lime 表达智能正在运行。

---

# 11. ADui Purple

主品牌色：

```css
--adui-purple: #5b2b82;
```

用于：

```text
Primary Button
Navigation Active
Selected State
Logo
Brand
Link
Focus
重要操作
Workflow Selected
Agent Identity
```

---

# 12. Purple 色阶

```css
--purple-50: #f5f0f8;
--purple-100: #e9ddf0;
--purple-200: #d3bee1;
--purple-300: #b891cc;
--purple-400: #8b51a6;

--purple-500: #5b2b82;

--purple-600: #4e246f;
--purple-700: #411d5d;
--purple-800: #34174a;
--purple-900: #281137;
--purple-950: #1a0b25;
```

---

# 13. ADui Lime

Agent 信号色：

```css
--adui-lime: #6cff00;
```

主要用于：

```text
Agent Running
Agent Ready
Local Runner Connected
Sandbox Active
MCP Available
AI Execution
活动状态指示
品牌高亮
```

---

# 14. Lime 色阶

```css
--lime-50: #f3ffe8;
--lime-100: #e4ffc7;
--lime-200: #c8ff91;
--lime-300: #aaff5b;
--lime-400: #86ff29;

--lime-500: #6cff00;

--lime-600: #54cc00;
--lime-700: #409900;
--lime-800: #2f7000;
--lime-900: #244f0b;
--lime-950: #132b05;
```

---

# 15. 品牌渐变

来源于 Logo：

```css
--adui-gradient: linear-gradient(135deg, #5b2b82 0%, #5b2b82 50%, #6cff00 100%);
```

只用于：

```text
Logo
Splash
Welcome
App Icon
About
品牌启动动画
官网 Hero 局部
Agent Activation
```

禁止用于：

```text
所有按钮
所有 Card
大面积 Background
表格
输入框
Terminal
Diff
所有标题
```

---

# 16. Lime 不等于 Success

严格区分：

```text
#6CFF00
ADui Lime
=
Agent Active

#22C55E
Success Green
=
Operation Success
```

例如：

```text
● Agent Running
```

使用 Lime。

而：

```text
✓ 32 tests passed
```

使用 Success Green。

---

# 17. Semantic Colors

Success：

```css
#22C55E
```

Warning：

```css
#F59E0B
```

Error：

```css
#EF4444
```

Info：

```css
#3B82F6
```

---

# 18. 状态色优先级

当品牌色与业务状态发生冲突时：

```text
业务语义
↓
可访问性
↓
交互状态
↓
品牌
↓
装饰
```

因此：

```text
Run Failed
```

必须使用 Red。

不能因为 Agent 是品牌功能就继续使用 Lime。

---

# 19. Dark First

ADui Forge 默认：

```text
Dark Mode
```

支持：

```text
Dark
Light
System
```

Desktop 默认推荐：

```text
Dark
```

Mobile 默认：

```text
System
```

---

# 20. Dark Theme

```css
--background: #0b0d10;

--surface-1: #111318;
--surface-2: #171a21;
--surface-3: #1c2028;
--surface-active: #222732;

--border-subtle: #20242c;
--border-default: #292e39;
--border-strong: #3a4150;

--text-primary: #f4f4f5;
--text-secondary: #a1a1aa;
--text-tertiary: #71717a;
--text-disabled: #52525b;

--primary: #5b2b82;
--primary-hover: #6a3692;

--agent: #6cff00;
```

---

# 21. Light Theme

```css
--background: #ffffff;

--surface-1: #f8f9fb;
--surface-2: #ffffff;
--surface-3: #f1f3f6;
--surface-active: #e9ecf1;

--border-subtle: #eceef2;
--border-default: #dde1e7;
--border-strong: #c8cdd5;

--text-primary: #18181b;
--text-secondary: #52525b;
--text-tertiary: #71717a;
--text-disabled: #a1a1aa;

--primary: #5b2b82;

--agent: #6cff00;
--agent-text: #409900;
```

---

# 22. Design Token

Web / Tauri 统一维护：

```text
packages/ui
```

建议：

```css
:root {
  --adui-purple: #5b2b82;
  --adui-lime: #6cff00;

  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

禁止页面大量硬编码 Hex。

---

# 23. Flutter Token

统一建立：

```text
ForgeColors
ForgeSpacing
ForgeRadius
ForgeTypography
ForgeTheme
ForgeMotion
```

例如：

```dart
static const brandPurple = Color(0xFF5B2B82);
static const brandLime = Color(0xFF6CFF00);
```

页面不要重复：

```dart
Color(0xFF5B2B82)
```

---

# 24. 字体

Web / Desktop：

```text
Inter
```

中文：

```text
PingFang SC
Microsoft YaHei
Noto Sans CJK SC
```

代码：

```text
JetBrains Mono
```

Flutter：

```text
System Font
```

避免为了统一桌面视觉强制 APP 加载额外字体。

---

# 25. 字号

Desktop / Web：

```text
12px   Caption
13px   Dense UI
14px   Default
16px   Important
18px   Section
20px   Page Title
24px   Major Title
32px   Brand / Hero
```

默认 UI：

```text
14px
```

---

# 26. 字重

```text
400 Regular
500 Medium
600 Semibold
700 Bold
```

大多数界面：

```text
400 / 500
```

标题：

```text
600
```

不要全界面 Semibold。

---

# 27. 间距

基础单位：

```text
4px
```

允许：

```text
4
8
12
16
20
24
32
40
48
64
```

禁止随意：

```text
13
17
19
23
27
```

---

# 28. 圆角

开发工具保持克制。

```text
2px   极小元素
4px   小控件
6px   默认
8px   Card / Popover
12px  大容器
```

默认：

```text
6px
```

避免全产品使用：

```text
16px
20px
24px
```

大圆角。

---

# 29. Shadow

Dark Mode 优先：

```text
Border
+
Surface
```

而不是 Shadow。

Popover / Modal 可使用：

```css
box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);
```

---

# 30. Desktop 总体布局

```text
┌──────────────────────────────────────────────────────────────┐
│ Title Bar                                                    │
├──────┬─────────────────────────────────────┬─────────────────┤
│      │                                     │                 │
│Activity│ Main Workspace                    │ Agent Panel     │
│ Bar  │                                     │                 │
│      │                                     │                 │
├──────┼─────────────────────────────────────┴─────────────────┤
│Side  │ Terminal │ Problems │ Output │ Tests │ Trace         │
│bar   │                                                       │
├──────┴───────────────────────────────────────────────────────┤
│ Status Bar                                                   │
└──────────────────────────────────────────────────────────────┘
```

---

# 31. Title Bar

Desktop 高度：

```text
40px
```

包含：

```text
Logo
Workspace
Branch
Search / Command
Run
Connection
Window Control
```

Tauri Desktop 推荐 Custom Title Bar。

---

# 32. Activity Bar

宽：

```text
48px
```

功能：

```text
Explorer
Search
Git
Agents
Tasks
Workflow
MCP
Skills
```

默认图标：

```text
20px
```

Selected：

```text
Purple Indicator
+
Active Surface
```

Agent 工作时可以出现：

```text
Lime Dot
```

---

# 33. Sidebar

默认：

```text
240px
```

限制：

```text
200px ~ 360px
```

支持：

```text
Resize
Collapse
Restore
```

---

# 34. Agent Panel

默认：

```text
360px
```

范围：

```text
320px ~ 600px
```

支持：

```text
Resize
Hide
Restore
```

Agent Panel 不作为普通 Drawer。

它是一级工作区域。

---

# 35. Bottom Panel

默认：

```text
240px
```

包含：

```text
Terminal
Problems
Output
Tests
Trace
Logs
```

支持：

```text
Resize
Hide
Maximize
Restore
```

---

# 36. Status Bar

高度：

```text
22px
```

显示：

```text
Branch
Runner
Sandbox
Model
Agent
Connection
Problems
```

例如：

```text
 main   ● Local Runner   Docker   GPT-5.x   0 errors
```

Runner Active：

```text
Lime
```

---

# 37. Panel Resize 交互

用户拖动 Divider：

```text
Pointer Down
↓
显示 Resize Cursor
↓
实时 Resize
↓
Pointer Up
↓
保存尺寸
```

支持双击 Divider：

```text
恢复默认尺寸
```

Panel 尺寸按 Workspace 保存。

---

# 38. Panel Collapse

点击：

```text
Collapse
```

Panel 收起。

再次点击恢复上次尺寸，而不是默认尺寸。

---

# 39. 页面导航

主要采用：

```text
Persistent Navigation
+
Workspace Tabs
+
Command Palette
```

避免通过多层 Breadcrumb 承担所有导航。

---

# 40. Workspace Tabs

编辑区支持：

```text
File
Diff
Workflow
Preview
Settings
```

Tabs。

支持：

```text
Close
Close Others
Close Right
Pin
Reorder
```

---

# 41. Command Palette

核心入口。

快捷键：

```text
Ctrl + K
或
Ctrl + Shift + P
```

macOS：

```text
Cmd
```

支持：

```text
Open File
Run Agent
Switch Agent
Switch Model
New Task
Run Test
Git Status
Open Settings
Open MCP
Open Skill
Toggle Panel
```

---

# 42. Command Palette 交互

打开后：

```text
输入关键词
↓
实时 Filter
↓
上下键选择
↓
Enter 执行
↓
Esc 关闭
```

支持最近使用排序。

---

# 43. Button

高度：

```text
Small     28px
Default   32px
Large     36px
```

类型：

```text
Primary
Secondary
Outline
Ghost
Danger
```

同一区域通常只保留：

```text
1 Primary Action
```

---

# 44. Button 状态

必须包含：

```text
Default
Hover
Pressed
Focus
Disabled
Loading
```

Loading 时：

- 不改变 Button 宽度
- 禁止重复点击
- 显示 Spinner
- 保留动作文案

例如：

```text
Saving...
```

---

# 45. Input

默认：

```text
32px
```

必须包含：

```text
Default
Hover
Focus
Error
Disabled
Readonly
```

Focus 使用 Purple。

不要使用 Lime Focus Ring。

---

# 46. Form 错误

字段错误：

```text
Input
↓
Error Border
↓
Error Message
```

例如：

```text
API Key

[••••••••••]

API Key is required.
```

不要只显示红框而没有错误原因。

---

# 47. Select

支持：

```text
Keyboard
Search
Recent
Grouping
Disabled
Description
```

模型选择器至少展示：

```text
Provider
Model
Capability
```

例如：

```text
OpenAI
GPT-5.x
Reasoning · Tool Calling
```

---

# 48. Table

默认行高：

```text
40px
```

支持：

```text
Sort
Filter
Search
Resize Column
Hide Column
Pagination / Virtualization
Keyboard Selection
```

---

# 49. Table Row 交互

单击：

```text
Select
```

双击：

```text
Open Detail
```

如果双击行为存在，必须保证单击后仍有明确 Action。

---

# 50. Context Menu

Desktop 支持 Right Click。

例如 Workspace File：

```text
Open
Open to Side
Add to Context
Ask Agent
Copy Path
Rename
Delete
Reveal
```

Mobile 不复制右键逻辑。

---

# 51. Tooltip

所有 Icon-only 操作：

```text
必须 Tooltip
```

推荐：

```text
300~500ms
```

支持显示快捷键：

```text
Open Terminal   Ctrl + J
```

---

# 52. Toast

用于：

```text
Saved
Copied
Connected
Started
Completed
```

不要用于展示复杂错误。

复杂问题进入：

```text
Error Panel
Problems
Run Detail
Logs
```

---

# 53. Modal

只用于需要中断当前操作的内容：

```text
Dangerous Confirmation
Delete
Authentication
Sensitive Approval
```

普通内容优先：

```text
Panel
Sheet
Popover
Page
```

---

# 54. Drawer / Sheet

用于辅助信息：

```text
Run metadata
Settings Detail
Mobile Filter
Artifact Detail
```

不能用 Drawer 替代所有页面。

---

# 55. Agent Interaction Model

Agent 是 ADui Forge 核心。

基础模式：

```text
Ask
Plan
Agent
```

---

# 56. Ask Mode

只允许：

```text
读取上下文
回答
解释
分析
```

默认：

```text
不修改文件
不运行破坏性 Tool
```

---

# 57. Plan Mode

流程：

```text
Understand
↓
Inspect
↓
Analyze
↓
Plan
↓
Wait
```

不自动修改文件。

用户可以：

```text
Run Plan
Edit Plan
Cancel
```

---

# 58. Agent Mode

允许：

```text
Read
Search
Edit
Tool
MCP
Shell
Test
Build
```

敏感动作仍进入 Approval。

---

# 59. Agent Composer

结构：

```text
┌─────────────────────────────────────────┐
│ Ask ADui Forge...                       │
│                                         │
│ @Context   Agent Mode   Model      ▶    │
└─────────────────────────────────────────┘
```

支持：

```text
Multiline
File Mention
Folder Mention
Agent Mention
Skill Mention
MCP Mention
Attachment
Model
Mode
```

---

# 60. Composer 快捷键

```text
Enter
发送
```

多行模式可配置：

```text
Ctrl/Cmd + Enter
发送
```

默认必须避免用户写多行 Prompt 时误发送。

推荐：

```text
Enter = New Line
Ctrl/Cmd + Enter = Run
```

Desktop 设置允许用户切换。

---

# 61. Mention System

支持：

```text
@file
@folder
@agent
@skill
@mcp
@docs
@run
```

输入：

```text
@
```

弹出 Context Picker。

---

# 62. Context Picker

流程：

```text
输入 @
↓
显示最近 Context
↓
继续输入过滤
↓
选择
↓
显示 Context Chip
```

例如：

```text
[src/auth]
[REQUIREMENTS.md]
```

---

# 63. Context Chip

支持：

```text
View
Remove
```

Hover / Tap 显示完整路径。

大量 Context 时：

```text
3 files + 12 more
```

而不是无限横向堆叠。

---

# 64. Agent Chat

不要做传统社交软件聊天气泡。

推荐：

```text
User Prompt
────────────────────

Agent
● Running

Analyzing repository...

▸ Read 4 files
▸ Search authentication
● Running tests

────────────────────
```

Agent 内容融入工作区。

---

# 65. User Message

可以使用浅 Surface：

```text
Subtle Background
6px Radius
```

Maximum Width 不应过小。

长 Prompt 必须易于阅读和复制。

---

# 66. Agent Message

显示：

```text
Agent Avatar
Agent Name
Model
Status
Content
Actions
```

不要大面积紫色背景。

---

# 67. Agent Avatar

推荐：

```text
Purple Avatar
+
Lime Status Dot
```

例如：

```text
[A] ●
```

Purple：

```text
Agent Identity
```

Lime：

```text
Active
```

---

# 68. Thinking 状态

不显示完整内部 Chain-of-Thought。

只显示过程摘要：

```text
Analyzing repository
Searching related files
Planning implementation
Editing files
Running tests
Reviewing changes
```

---

# 69. Running 状态

示例：

```text
● Running · Editing auth.service.ts
```

Lime 只用于圆点。

允许轻微 Pulse。

---

# 70. Agent Stage

推荐阶段：

```text
Analyzing
Planning
Implementing
Testing
Reviewing
Completed
```

Agent 本身无法确定百分比时，不显示：

```text
73%
```

避免伪进度。

---

# 71. Agent Pause

用户点击 Pause：

```text
当前可安全停止的 Step 完成
↓
暂停 Run
↓
保留 Context
↓
显示 Paused
```

用户可：

```text
Resume
Cancel
```

---

# 72. Agent Cancel

Cancel 时：

```text
请求 Abort
↓
终止正在执行的 Tool
↓
Cleanup
↓
Run = Cancelled
```

必须与：

```text
Pause
```

区别。

---

# 73. Retry

失败 Run 提供：

```text
Retry
```

默认基于：

```text
当前 Task
当前 Context
上一次失败信息
```

重新运行。

高级用户可以：

```text
Retry From Step
```

---

# 74. Fork Run

允许：

```text
Fork
```

作用：

```text
保留已有 Context
↓
创建新的 Run
↓
允许调整 Prompt / Model / Strategy
```

---

# 75. Tool Call

默认折叠。

例如：

```text
✓ Read 4 files
✓ Search "AuthService"
✓ Edit auth.service.ts
● Run tests
```

点击后展开。

---

# 76. Tool Detail

展开后：

```text
Tool
Input
Output
Status
Duration
Error
```

技术型 Tool 可以增加：

```text
Raw
```

---

# 77. Tool Running

```text
● Run tests
```

Lime Dot。

完成：

```text
✓ Run tests
```

Green。

失败：

```text
✕ Run tests
```

Red。

---

# 78. Shell Interaction

显示：

```text
$ pnpm test
```

展开：

```text
stdout
stderr
exitCode
duration
```

操作：

```text
Copy
Open in Terminal
Retry
```

---

# 79. 长 Tool Output

默认限制高度。

显示：

```text
Show full output
```

禁止一个 npm install 输出占满整个 Agent Chat。

---

# 80. File Change Interaction

修改后显示：

```text
M src/auth/auth.service.ts
A src/auth/auth.service.spec.ts
```

点击：

```text
Open Diff
```

右键：

```text
Open File
Open Diff
Revert File
Add to Context
```

---

# 81. Diff

Diff 是一级功能。

支持：

```text
Split
Unified
```

Desktop 默认：

```text
Split
```

Mobile：

```text
Unified
```

---

# 82. Diff Interaction

支持：

```text
Next Change
Previous Change
Accept File
Reject File
Revert
Open File
Copy
```

未来支持：

```text
Accept Hunk
Reject Hunk
```

---

# 83. Diff 颜色

Added：

```text
Semantic Green
```

Deleted：

```text
Semantic Red
```

不能使用 Lime 表示 Added。

---

# 84. Review Flow

Agent 完成修改后：

```text
Agent Completed
↓
Run Summary
↓
Changed Files
↓
View Diff
↓
User Review
↓
Accept / Revert
↓
Commit
```

---

# 85. Run Summary

示例：

```text
Completed

Changed
4 files

Tests
18 passed

Build
Passed

Duration
2m 42s

Tokens
21.4K
```

主要操作：

```text
Review Changes
```

次级：

```text
Retry
Fork
Commit
```

---

# 86. Approval Interaction

涉及危险动作时：

```text
Agent
↓
Request Approval
↓
Run = Waiting Approval
↓
用户收到提示
↓
查看 What / Why / Impact / Risk
↓
Approve / Reject
```

---

# 87. Approval Card

示例：

```text
⚠ Approval Required

Agent wants to execute:

git push origin feature/login

Reason
Publish the completed changes.

Impact
Writes changes to remote repository.

Risk
Medium

[Reject] [Approve]
```

---

# 88. Dangerous Approval

例如：

```text
git push --force
DROP DATABASE
rm -rf
Production Deployment
```

使用：

```text
Red
```

Approve 不获得默认 Focus。

用户必须主动选择。

---

# 89. Approval Remember

对于低风险重复权限，可支持：

```text
Allow once
Allow for this run
Always allow in this workspace
```

只有明确允许配置的 Tool 才能出现。

危险 Tool 禁止：

```text
Always Allow
```

---

# 90. Run Timeline

Run Detail 必须有 Timeline。

例如：

```text
00:00 Run started

00:03 Read repository

00:09 Search AuthService

00:17 Modified auth.service.ts

00:24 Running tests

00:36 Tests failed

00:41 Fixing regression

00:56 Tests passed

01:03 Run completed
```

---

# 91. Timeline Interaction

点击一个 Step：

```text
右侧 / 下方显示 Detail
```

Detail：

```text
Status
Input
Output
Duration
Files
Tool
Model
Error
```

---

# 92. Trace

高级模式提供：

```text
Run
├─ Context
├─ Model
├─ Tool: Search
├─ Model
├─ Tool: Edit
├─ Tool: Test
└─ Complete
```

支持：

```text
Expand
Collapse
Filter
Search
```

---

# 93. Trace Filter

可过滤：

```text
Model
Tool
MCP
Agent
Error
Approval
```

---

# 94. Error UX

Agent 失败时不要只显示：

```text
Run Failed
```

必须显示：

```text
发生了什么
失败在哪一步
可能原因
是否可以 Retry
日志在哪里
```

例如：

```text
Tests failed

2 tests are still failing in auth.service.spec.ts.

[View tests]
[Retry]
[Ask Agent to fix]
```

---

# 95. Error Recovery

错误后的推荐操作根据类型动态调整。

Tool Error：

```text
Retry Tool
```

Test Failure：

```text
Ask Agent to Fix
```

Network：

```text
Reconnect
```

Provider：

```text
Switch Model
```

Permission：

```text
Request Access
```

---

# 96. Terminal

使用：

```text
xterm.js
```

设计保持：

```text
Neutral
Monospace
Dense
```

支持：

```text
Multiple Tabs
Split
Search
Copy
Restart
Kill
```

---

# 97. Terminal 交互

新建：

```text
+
```

关闭有运行任务时：

```text
Process is still running.

[Cancel]
[Terminate]
```

禁止直接静默杀死。

---

# 98. Terminal 与 Agent

Agent 执行 Shell 默认在 Agent Tool 中展示。

用户可：

```text
Open in Terminal
```

打开关联 Sandbox Terminal。

---

# 99. Explorer

行高：

```text
24px
```

展示：

```text
File Icon
Name
Git Status
Problem
Agent Change
```

---

# 100. Explorer 交互

Single Click：

```text
Preview
```

Double Click：

```text
Pin Tab
```

推荐保持 IDE 通用习惯。

---

# 101. Explorer Drag

支持：

```text
File
↓
Agent Composer
```

结果：

```text
Add to Context
```

不直接上传或移动文件。

---

# 102. Search

Workspace Search：

```text
Text
Case
Whole Word
Regex
```

搜索结果显示：

```text
File
Line
Match
Context
```

点击跳转 Monaco。

---

# 103. Git Panel

展示：

```text
Changes
Staged
Commits
Branches
```

Agent Modified 文件可增加：

```text
Agent
```

小标识。

不要改变标准 Git 状态颜色。

---

# 104. Commit Interaction

流程：

```text
Review Diff
↓
Stage
↓
Commit Message
↓
Commit
```

可以：

```text
Generate Commit Message
```

但必须允许用户编辑。

---

# 105. Workflow Editor

使用：

```text
React Flow
```

支持：

```text
Pan
Zoom
Select
Connect
Move
Delete
Copy
Paste
Undo
Redo
```

---

# 106. Workflow Node

类型：

```text
Start
Agent
Skill
Tool
MCP
Condition
Approval
Human Input
Parallel
Join
Sub Workflow
End
```

---

# 107. Workflow Node 视觉

Node 采用：

```text
Neutral Surface
+
Small Accent
```

Selected：

```text
Purple Border
```

Running：

```text
Lime Indicator
```

Completed：

```text
Green
```

Failed：

```text
Red
```

Approval：

```text
Amber
```

---

# 108. Workflow Connection

拖动 Handle：

```text
Pointer Down
↓
显示 Available Target
↓
Connect
↓
校验节点关系
```

非法连接：

```text
Red
+
Reason Tooltip
```

---

# 109. Workflow Inspector

选择 Node 后：

```text
右侧 Inspector
```

包含：

```text
Name
Configuration
Model
Agent
Input
Output
Permission
Retry
Timeout
```

---

# 110. Workflow Run

运行时 Workflow Canvas 可以展示：

```text
Current Node
Completed Nodes
Failed Node
Waiting Approval
```

当前节点使用：

```text
Lime
```

微弱 Running Indicator。

---

# 111. MCP 页面

显示：

```text
Name
Transport
Source
Status
Tools
Resources
Prompts
Last Connected
```

---

# 112. MCP Connection Flow

```text
Add MCP
↓
Configure
↓
Test Connection
↓
Discover Capabilities
↓
Review Permissions
↓
Enable
```

不能：

```text
Add
↓
直接给所有 Agent 使用
```

---

# 113. MCP 状态

```text
Connected
Connecting
Authentication Required
Disconnected
Failed
Disabled
```

Agent 可使用状态：

```text
Lime Dot
```

Failed：

```text
Red
```

---

# 114. Skill 页面

显示：

```text
Name
Description
Version
Source
Tools
Permissions
Agents
Status
```

Skill 可以：

```text
Enable
Disable
Inspect
Update
Remove
```

---

# 115. Skill 安装

流程：

```text
Choose Skill
↓
Review Contents
↓
Review Tools
↓
Review Permissions
↓
Install
```

如果 Skill 请求敏感权限必须明确展示。

---

# 116. Model Selector

快速 Model Selector 应显示：

```text
Provider
Model
Capability
```

高级详情：

```text
Context
Reasoning
Vision
Tool Calling
Cost
Latency
```

---

# 117. Model Switch

未运行时：

```text
立即切换
```

Run 正在执行：

```text
当前 Run 保持原模型
下一 Run 使用新模型
```

禁止运行过程中静默切 Model。

---

# 118. Local / Cloud Interaction

用户必须始终知道：

```text
代码在哪里
Agent 在哪里运行
使用哪个模型
Sandbox 在哪里
```

---

# 119. Execution Badge

例如：

```text
Local
Cloud
Hybrid
```

点击显示详情：

```text
Workspace: Local
Runner: Local
Sandbox: Docker
Model: Cloud
```

---

# 120. Local Runner

状态：

```text
Starting
Connected
Busy
Disconnected
Failed
```

Connected：

```text
Lime Dot
```

---

# 121. Runner Disconnect

运行中掉线：

```text
Connection lost
↓
Run 状态保持
↓
尝试 Reconnect
↓
展示状态
```

不要直接把任务标为 Failed，除非确认 Runner 已停止。

---

# 122. Sandbox

状态：

```text
Creating
Starting
Running
Stopping
Stopped
Failed
```

Running：

```text
Lime
```

Finished：

```text
Neutral
```

不是 Success Green。

---

# 123. Dashboard

只保留真正重要的内容：

```text
Active Runs
Pending Approvals
Recent Tasks
Recent Workspaces
Failed Runs
Usage
```

避免：

```text
十几个 KPI Card
```

---

# 124. Dashboard Primary Area

最优先：

```text
Active Runs
```

因为 ADui Forge 的核心是 Agent 正在做什么。

---

# 125. Active Run Card

显示：

```text
Task
Agent
Stage
Elapsed
Workspace
Current Action
```

例如：

```text
Fix authentication regression

Frontend Agent
● Running · Running tests

adui-forge
1m 24s
```

点击进入 Run Detail。

---

# 126. Pending Approval

Dashboard 必须高优先显示：

```text
Pending Approval
```

因为任务可能因 Approval 停止。

---

# 127. Empty State

错误示例：

```text
暂无数据
```

正确：

```text
No workspace yet

Open a local repository or clone one
to start working with an Agent.

[Open Repository]
```

必须告诉用户：

```text
现在是什么状态
下一步能做什么
```

---

# 128. Loading

短操作：

```text
Spinner
```

页面：

```text
Skeleton
```

Agent：

```text
Stage Indicator
```

长任务不能只显示无限 Spinner。

---

# 129. Optimistic UI

适合：

```text
Rename
Toggle
Pin
Local Preference
```

不适合：

```text
Approval
Git Push
Deployment
Delete
Agent Run Start
```

高风险动作必须等 Server 确认。

---

# 130. Undo

低风险即时操作应尽量支持 Undo。

例如：

```text
Removed context
[Undo]
```

删除重要资源仍需要 Confirmation。

---

# 131. Keyboard First

Desktop / Web 核心快捷键建议：

```text
Ctrl/Cmd + K
Command Palette

Ctrl/Cmd + P
Quick Open

Ctrl/Cmd + Enter
Run Agent

Ctrl/Cmd + J
Terminal

Ctrl/Cmd + Shift + A
Agent Panel

Ctrl/Cmd + Shift + G
Git

Ctrl/Cmd + Shift + F
Search

Ctrl/Cmd + ,
Settings
```

---

# 132. Esc

统一优先级：

```text
关闭 Context Menu
↓
关闭 Popover
↓
关闭 Dialog
↓
取消当前临时操作
```

不能直接用 Esc 停止 Agent。

停止 Agent 必须使用明确命令。

---

# 133. Global Search

`Ctrl/Cmd + K` 可同时搜索：

```text
Command
File
Agent
Task
Workspace
Setting
```

通过类别区分。

---

# 134. Drag & Drop

支持：

```text
File → Agent Context
File → Editor
Workflow Node
Panel Resize
Editor Tab Reorder
```

所有核心 Drag 操作必须提供非 Drag 替代方式。

---

# 135. Hover

Hover 只提供辅助增强。

不能依赖 Hover 才能完成核心操作。

尤其：

```text
Mobile
Touchscreen Laptop
```

无 Hover。

---

# 136. Motion

动画原则：

```text
Fast
Subtle
Functional
```

Duration：

```text
100ms
150ms
200ms
```

Panel：

```text
200~250ms
```

---

# 137. 推荐动画

允许：

```text
Fade
Small Slide
Opacity
Scale 0.98 → 1
Indicator Pulse
```

禁止：

```text
Bounce
Elastic
3D Rotate
Large Movement
Rainbow
Complex Glow
```

---

# 138. Lime Animation

只允许在：

```text
Agent Running
Runner Active
Sandbox Active
```

使用极轻 Pulse。

不使用大型 Neon Glow。

---

# 139. Reduced Motion

支持：

```text
prefers-reduced-motion
```

用户开启 Reduced Motion 后：

```text
取消 Pulse
取消非必要 Transition
保留状态变化
```

---

# 140. Responsive

主要断点：

```text
< 768px
Mobile Web

768 ~ 1199px
Tablet

1200 ~ 1439px
Desktop

>= 1440px
Large Desktop
```

Web 主要优化：

```text
>= 1200px
```

---

# 141. 窄窗口 Desktop

窗口变窄时按顺序：

```text
隐藏 Secondary Sidebar
↓
缩小 Agent Panel
↓
允许隐藏 Bottom Panel
↓
保留 Main Editor
```

不能优先压缩 Editor 到无法使用。

---

# 142. Mobile Web

Mobile Web 不提供完整 Desktop IDE。

自动降级到：

```text
Task
Agent
Run
Approval
Diff
```

为主。

---

# 143. Flutter 信息架构

Bottom Navigation：

```text
Home
Tasks
Agent
Approvals
Me
```

最多：

```text
5
```

---

# 144. Mobile Home

推荐：

```text
ADui Forge

Active
─────────────────
Frontend Agent
● Running
Fix login issue

Approval
─────────────────
1 operation requires approval

Recent
─────────────────
adui-forge
forge-ui
```

---

# 145. Mobile Agent Chat

保留：

```text
Prompt
Response
Stage
Tool Summary
Approval
```

Tool Raw Output 默认折叠。

---

# 146. Mobile Run Detail

展示：

```text
Task
Status
Stage
Timeline
Changes
Tests
Approval
Summary
```

不显示完整 IDE 布局。

---

# 147. Mobile Diff

只使用：

```text
Unified
```

默认逐文件浏览。

操作：

```text
Previous File
Next File
Previous Change
Next Change
```

---

# 148. Mobile Approval

Approval 为 Mobile 一级能力。

流程：

```text
Push Notification
↓
Open Approval
↓
Review Risk
↓
Approve / Reject
↓
Agent Resume
```

---

# 149. Mobile Touch Target

所有主要交互区域至少：

```text
44 × 44
```

避免桌面 28px Button 原样迁移到手机。

---

# 150. Web / Desktop 共享

必须共享：

```text
Design Token
UI Components
Feature Components
Terminology
Status
Interaction Model
```

Desktop 额外增加：

```text
Native
Local Runner
Local Workspace
Terminal
```

---

# 151. Flutter 一致性

Flutter 不要求像素复制 React。

必须一致：

```text
Brand
Color Semantic
Terminology
Task State
Agent State
Approval Logic
Information Architecture
```

必须尊重移动端原生交互。

---

# 152. 多端实时同步

例如用户：

```text
Desktop 启动 Agent
```

手机应该实时看到：

```text
Running
```

手机 Approve 后：

```text
Desktop
Web
```

同步变为：

```text
Approved
Running
```

---

# 153. 多端冲突

例如 Desktop 和 Mobile 同时操作 Approval。

第一个成功后：

另一个客户端立即显示：

```text
Already approved by ADui
```

并禁用 Button。

---

# 154. Notification

分：

```text
Information
Success
Warning
Action Required
Failure
```

关键通知：

```text
Approval Required
Run Failed
Run Completed
Runner Disconnected
```

---

# 155. Desktop Notification

当窗口不在前台：

```text
Run Completed
Approval Required
Run Failed
```

允许发送系统 Notification。

---

# 156. Notification 点击

例如：

```text
Approval Required
```

点击后直接导航到对应：

```text
Run → Approval
```

而不是 Dashboard。

---

# 157. Status 文案

推荐：

```text
Queued
Preparing
Running
Waiting for approval
Waiting for input
Paused
Completed
Failed
Cancelled
Timed out
```

统一管理，不允许模块自己翻译一套。

---

# 158. 中文状态

```text
排队中
准备中
运行中
等待批准
等待输入
已暂停
已完成
失败
已取消
超时
```

---

# 159. 文案原则

操作使用动词：

```text
运行
停止
重试
批准
拒绝
打开
保存
连接
```

避免：

```text
点击此处进行运行
点击按钮进行保存
```

---

# 160. Dangerous Copy

错误：

```text
是否确认？
```

正确：

```text
确定删除 “Frontend Agent”？

删除后无法恢复。
```

---

# 161. Time

列表显示：

```text
3分钟前
2小时前
昨天
```

Hover / Detail：

```text
2026-09-06 00:15:32
```

---

# 162. Accessibility

目标：

```text
WCAG 2.2 AA
```

必须支持：

```text
Keyboard
Focus
ARIA
Contrast
Reduced Motion
Screen Reader
```

---

# 163. Focus

任何 Interactive Element 必须：

```text
Focus Visible
```

禁止：

```css
outline: none;
```

而没有替代 Focus。

---

# 164. 状态不能只靠颜色

错误：

```text
红色圆点
```

正确：

```text
✕ Failed
```

Running：

```text
● Running
```

---

# 165. Screen Reader

Icon-only Button：

必须提供：

```text
aria-label
```

例如：

```text
Close terminal
```

---

# 166. Monaco

Monaco 视觉以其本身成熟交互为主。

不要为了统一 UI：

```text
魔改编辑器所有内部组件
```

主题只需要与 ADui Forge Dark / Light 协调。

---

# 167. xterm.js

同样保持 Terminal 原生工具体验。

品牌色仅做：

```text
Active Indicator
Prompt Accent
```

而不是把 Terminal 变成品牌展示。

---

# 168. Icon

Web / Desktop：

```text
Lucide
```

尺寸：

```text
16
18
20
```

默认：

```text
16px
```

不要混用：

```text
Lucide
Material Icons
FontAwesome
Heroicons
```

---

# 169. Flutter Icon

Flutter 优先：

```text
Material Symbols / Icons
```

但图标含义与 Web 保持一致。

---

# 170. Card 使用规则

Card 适合：

```text
Dashboard Summary
Empty State
Approval
Independent Resource
```

不适合：

```text
IDE 主工作区每一个区域
```

工作区使用：

```text
Panel
Surface
Divider
```

---

# 171. Z-Index

统一：

```text
0   Base
10  Sticky
20  Dropdown
30  Popover
40  Tooltip
50  Modal
60  System Overlay
```

禁止：

```text
9999
999999
```

随意竞争层级。

---

# 172. 页面状态要求

所有异步页面必须考虑：

```text
Loading
Empty
Success
Error
Offline
Permission Denied
```

Agent 页面额外：

```text
Idle
Running
Waiting
Paused
Failed
Cancelled
Completed
```

---

# 173. 首次启动

Desktop Onboarding：

```text
1 Welcome
2 Configure Provider
3 Open Repository
4 Start Local Runner
5 Run First Task
```

最多：

```text
3~5
```

个核心步骤。

---

# 174. Progressive Onboarding

第一次不强制用户理解：

```text
MCP
Skill
Workflow
Trace
Vector Search
Multi-Agent
```

用户完成第一次 Agent Run 后，再逐步发现高级能力。

---

# 175. First Run

第一次任务可以提供：

```text
Explain this repository
Find potential problems
Add a README
Run tests and summarize failures
```

帮助用户理解能力。

---

# 176. Settings

分类：

```text
General
Appearance

Agents

Models
Providers

MCP
Skills
Tools

Runner
Sandbox
Git

Notifications
Security

Account
```

不能所有设置放一个超级 Form。

---

# 177. Appearance

允许：

```text
System
Dark
Light
```

以及：

```text
Compact
Comfortable
```

Desktop 默认：

```text
Dark
Compact
```

Mobile：

```text
System
Comfortable
```

---

# 178. 密度

Compact：

```text
28~32px Controls
36~40px Table
```

Comfortable：

```text
36~40px Controls
44~48px Rows
```

---

# 179. Privacy UX

Local Workspace 必须明确：

```text
Local
```

例如：

```text
Local execution

Source code stays on this device.
```

---

# 180. Cloud UX

Cloud Run 必须能查看：

```text
Repository
Sandbox
Region / Runtime
Model Provider
```

用户不能误以为任务仍在本地。

---

# 181. Security UX

权限请求必须解释：

```text
What
Why
Impact
Duration
```

不能只弹：

```text
Agent requests permission.
```

---

# 182. Loading 与 Agent Thinking 区别

Loading：

```text
系统正在获取数据
```

Thinking：

```text
Agent 正在执行推理阶段
```

Running：

```text
Agent 正在执行 Tool
```

三种视觉不能混成同一个 Spinner。

---

# 183. Performance UX

用户触发操作后：

```text
100ms 内
```

最好有视觉响应。

超过约：

```text
300~500ms
```

显示 Loading State。

超过几秒的操作必须说明阶段。

---

# 184. Skeleton

只用于：

```text
布局已知
数据正在加载
```

禁止给未知结构硬塞 Skeleton。

---

# 185. Optimistic Feedback

点击：

```text
Copy
Pin
Toggle
```

立即反馈。

点击：

```text
Run Agent
```

必须先收到 Run Created，再进入 Running 状态。

---

# 186. Page Transition

Desktop 不做大面积 Page Slide。

主要使用：

```text
Immediate
+
Small Fade
```

保持工具感。

---

# 187. Agent 动效原则

用户要感觉：

> Agent 活着。

但不能感觉：

> UI 在表演 AI。

因此只允许：

```text
Lime Dot
Small Pulse
Streaming Text
Stage Change
Tool State
```

---

# 188. Streaming

必须是真 Streaming。

Agent Response：

```text
Token / Chunk
```

逐步呈现。

不能：

```text
完整生成后
↓
假装一个字一个字显示
```

---

# 189. Streaming 自动滚动

如果用户当前位于 Chat 底部：

```text
自动 Follow
```

如果用户主动向上滚动：

```text
停止 Auto Scroll
```

底部出现：

```text
↓ Jump to latest
```

---

# 190. 新消息

用户离开底部时：

```text
3 new updates
```

不要强行把用户拉到底。

---

# 191. Long Conversation

长 Agent Run 中：

```text
按 Step 分组
```

而不是无限消息列表。

例如：

```text
Planning
Implementation
Tests
Review
```

---

# 192. Tool Group

连续的：

```text
read_file
read_file
read_file
```

可以聚合：

```text
Read 7 files
```

减少视觉噪声。

---

# 193. Log Level

日志支持：

```text
All
Info
Warning
Error
```

高级：

```text
Model
Tool
MCP
Runner
Sandbox
```

---

# 194. Copy Everywhere

开发工具应该方便复制：

```text
File Path
Code
Command
Error
Run ID
Task ID
Tool Output
JSON
```

---

# 195. Hover Metadata

不影响主要信息的 Metadata 可使用 Tooltip。

例如：

```text
Run duration
Exact timestamp
Token count
Full file path
```

---

# 196. Destructive Action

危险操作：

```text
Red
```

必须远离 Primary Action。

例如：

```text
[Save]

...

[Delete Agent]
```

而不是并排：

```text
[Save] [Delete]
```

---

# 197. Confirmation

Confirmation 只用于真实风险。

不要所有操作都：

```text
确认吗？
```

否则用户会形成 Confirmation Fatigue。

---

# 198. Undo 优先

能够撤销的轻操作：

```text
优先 Undo
```

无法撤销的操作：

```text
Confirmation
```

---

# 199. 网络断开

Web：

```text
Offline banner
```

Desktop：

区分：

```text
Cloud disconnected
```

和：

```text
Local Runner disconnected
```

两者不是同一状态。

---

# 200. 最终桌面体验

核心用户流程：

```text
打开 ADui Forge
↓
Open Repository
↓
进入 Workspace
↓
选择 Agent
↓
输入任务
↓
Agent Analyzing
↓
Agent Planning
↓
Agent Editing
↓
Tool Calls
↓
Tests
↓
Approval（如需要）
↓
Agent Completed
↓
Review Diff
↓
Commit
```

整个流程不应要求用户频繁跳页面。

---

# 201. 推荐 Workspace 默认比例

Desktop 大屏：

```text
Explorer
15%

Editor
60%

Agent
25%
```

只是默认值。

用户可自由 Resize。

---

# 202. Agent 与 Editor 关系

核心原则：

> Code is primary. Agent is collaborator.

禁止把 Desktop 变为：

```text
70% AI Chat
+
30% Code
```

这会变成 AI Chat 产品，而不是 Agent 开发环境。

---

# 203. Mobile 核心流程

```text
收到通知
↓
打开 ADui Forge
↓
查看 Run
↓
查看 Agent 当前阶段
↓
查看 Diff / Test
↓
Approval
↓
Agent Resume
↓
查看完成结果
```

Mobile 的核心价值是：

> Remote Control。

不是 Mobile IDE。

---

# 204. Web 核心价值

Web 偏向：

```text
Cloud Workspace
Agent Management
Workflow
Team
Configuration
Monitoring
```

---

# 205. Desktop 核心价值

Desktop 偏向：

```text
Local Repository
Local Runner
IDE
Terminal
Git
Agent Coding
```

---

# 206. Mobile 核心价值

Mobile：

```text
Observe
Control
Approve
Notify
```

---

# 207. 组件体系

建议 `packages/ui` 建立：

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch

Dialog
Popover
Tooltip
Dropdown

Tabs
Panel
SplitPane

Table
Tree
List

EmptyState
ErrorState
LoadingState

CommandPalette
ContextMenu
```

---

# 208. Agent 专属组件

```text
AgentAvatar
AgentStatus
AgentComposer
AgentMessage
AgentStage

ContextPicker
ContextChip

RunStatus
RunTimeline
RunSummary

ToolCall
ToolResult

ApprovalCard

FileChangeList
DiffViewer

TraceTree
TraceDetail

ModelPicker
SkillBadge
McpStatus

ExecutionBadge
RunnerStatus
SandboxStatus
```

---

# 209. Desktop 专属组件

```text
TitleBar
ActivityBar
Sidebar
WorkspaceTabs
EditorArea
BottomPanel
StatusBar
TerminalPanel
CommandPalette
```

---

# 210. Mobile 专属组件

```text
MobileRunCard
MobileTaskCard
AgentMiniStatus
ApprovalSheet
MobileDiffViewer
RunStageTimeline
```

---

# 211. Design QA

任何页面交付前检查：

## Visual

```text
是否使用 Design Token？
是否支持 Dark？
是否支持 Light？
是否存在随机颜色？
是否存在过多 Card？
是否存在无意义 Gradient？
是否圆角过大？
```

## Interaction

```text
Hover 是否存在？
Focus 是否存在？
Disabled 是否存在？
Loading 是否存在？
Error 是否存在？
Keyboard 是否可用？
操作之后是否有 Feedback？
```

## Async

```text
Loading
Empty
Error
Offline
Permission
```

是否全部考虑？

## Agent

```text
Agent 状态是否明确？
当前阶段是否明确？
Tool 是否可查看？
Run 是否可 Stop？
Approval 是否可处理？
Error 是否可定位？
Diff 是否可 Review？
```

## Safety

```text
危险操作是否明确？
是否说明 Impact？
是否存在误点击风险？
是否可以 Undo？
```

---

# 212. UX 禁止事项

## 禁止传统后台风格

```text
大面积 Dashboard Card
大量 KPI
Sidebar + Header + CRUD Table everywhere
```

---

## 禁止通用 AI 产品风格

```text
紫蓝渐变 everywhere
Sparkle everywhere
Robot
Brain
Magic Wand everywhere
```

ADui Forge 已经有自己的 Purple + Lime 语言。

---

## 禁止过度赛博朋克

```text
荧光绿大面积背景
Neon Glow
网格背景 everywhere
HUD
科技大屏
```

---

## 禁止黑盒 Agent

不允许：

```text
Thinking...
Thinking...
Thinking...
Done
```

必须有：

```text
Stage
Tool
File
Test
Result
```

---

## 禁止假进度

Agent 不知道进度时禁止：

```text
43%
67%
92%
```

---

## 禁止假 Streaming

不允许完整结果回来后模拟 Streaming。

---

## 禁止隐藏危险操作

任何敏感 Tool 必须：

```text
Visible
Auditable
Controllable
```

---

## 禁止所有操作弹 Modal

优先：

```text
Inline
Panel
Popover
Undo
```

---

## 禁止移动端复制 Desktop

Flutter 必须重新组织信息层级。

---

# 213. ADui Forge 最终视觉语言

最终视觉公式：

```text
Dark Neutral Workspace

+

ADui Purple
#5B2B82
Engineering / Platform / Control

+

ADui Lime
#6CFF00
Agent / Intelligence / Execution
```

---

# 214. ADui Forge 最终交互语言

最终交互公式：

```text
Intent
↓
Context
↓
Agent
↓
Visible Execution
↓
Tool
↓
Feedback
↓
Approval
↓
Result
↓
Review
↓
Control
```

用户永远不应该面对：

```text
Prompt
↓
黑盒
↓
不知道发生了什么
↓
结果
```

---

# 215. 最终设计目标

ADui Forge 第一眼应该让用户认为：

> 这是一个专业、克制、高效的开发者工具。

第二眼能够意识到：

> 这是一个有自己品牌语言的 ADui 产品。

第三眼能够明显感受到：

> Agent 并不是聊天窗口，而是真正进入了开发流程。

第四层体验应该让开发者建立信任：

> 我清楚知道 Agent 在做什么、修改了什么、运行了什么，并且任何关键操作都仍然由我控制。

ADui Forge 不应该成为：

> 一个拥有代码编辑器的 AI Chat。

而应该成为：

# 一个真正以 Agent 为核心、开发者始终拥有控制权的软件开发工作空间。
