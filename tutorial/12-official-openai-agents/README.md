# 选修实验：用 OpenAI Agents SDK 观察 Agent 运行过程

> 建议在完成阶段 2、3 后选读；学习 handoff 前先读阶段 11。此实验不属于阶段 0～15 的离线必修主线。

本章使用 `C:\AI\openai-agents-js` 检出目录中的 `examples/learning-agent/lesson-01`～`lesson-06`。这些 lesson 是**在官方 SDK 源码仓库中编写的本地学习示例**，目前没有纳入该仓库的版本控制；它们不是 SDK 官方发布的示例，也不是本项目自带的可移植代码。只有本机保留这组文件时，下列命令才可直接运行。其他读者可参照[官方 SDK 文档](https://developers.openai.com/api/docs/guides/agents/sdk)和自己检出版本中的示例学习。

本项目的主线依旧使用供应商无关接口和无需 API Key 的 `examples/learning-agent-runtime`。这里借助具体 SDK 观察 `run`、工具调用和 handoff；实验结果依赖所用模型，不应当作 Agent Kernel 的普遍保证。

## 准备环境

在 PowerShell 中进入**包含这些本地 lesson 的** SDK 仓库，并确认文件存在：

```powershell
Set-Location C:\AI\openai-agents-js
Get-ChildItem examples\learning-agent\lesson-*.ts
```

使用仓库声明的 pnpm 版本安装依赖，并按该检出版本的构建说明构建工作区包。当前检出的根脚本是 `pnpm run build`，示例依赖工作区内的 `@openai/agents`；只执行 `pnpm install` 不足以保证示例能启动。安装和构建会修改 SDK 检出目录的依赖或生成物，请先检查该目录的 Git 状态。然后运行 `pnpm -F learning-agent build-check` 验证类型。

这些 lesson 需要 `OPENAI_API_KEY`。它们当前默认使用第三方 OpenAI 兼容接口和 `mimo-v2.5-pro`，并通过 `OpenAIChatCompletionsModel` 接入 SDK；如使用其他服务，请按该服务实际支持情况设置 `OPENAI_BASE_URL`、`OPENAI_MODEL` 和 API Key。调用真实模型可能产生费用。不要把 Key 写入教程或提交到 Git。

```powershell
$env:OPENAI_API_KEY = '你的 API Key'
# 仅在更换示例默认服务时设置：
# $env:OPENAI_BASE_URL = '服务的 API 地址'
# $env:OPENAI_MODEL = '该服务支持的模型名'
```

## 六个递进实验

| 实验 | 命令 | 观察重点 |
|---|---|---|
| 01 最小 Agent | `pnpm -F learning-agent start:01` | `Agent`、`run` 和打印出的 `finalOutput` |
| 02 单工具 | `pnpm -F learning-agent start:02` | 控制台中的 `[tool-call]`、`[tool-input]`、`[tool-output]` |
| 03 多工具 | `pnpm -F learning-agent start:03 "现在几点了？顺便告诉我北京天气。"` | 模型是否选择了两个工具，分别输入了什么 |
| 04 handoff | `pnpm -F learning-agent start:04` | triage 将控制权交给哪个专家，以及 `result.history` 中的记录 |
| 05 参数化 handoff | `pnpm -F learning-agent start:05 "Tell me the time in Beijing and the weather there."` | `inputType` 校验的 handoff 参数和 `onHandoff` 日志 |
| 06 两轮编排 | `pnpm -F learning-agent start:06` | 脚本如何根据第一轮历史主动发起第二次 `run` |

02、03、04、05 中是否调用工具或交接由模型选择。请以实际 `[tool-call]`、`[handoff]` 和历史记录判断；没有触发时记录现象并调整问题重试，不把预期写成已发生的事实。03 的天气数据来自代码中的固定 mock，**不是实时天气**。

05 的结构化参数由 `onHandoff` 接收并打印；当前示例没有把这些参数作为目标专家的独立状态保存。06 的“补齐天气”是脚本使用简单关键词判断并再次调用 `run` 的教学演示，不是 SDK 自动规划，也不保证所有措辞都能正确识别。handoff 会把当前分支的控制权交给专家；若需要一个主管统一汇总多个专家，可继续比较官方文档中的 [agents as tools](https://developers.openai.com/api/docs/guides/agents/orchestration) 模式。

## 继续阅读与可选扩展

SDK 源码仓库当前提供 `running-agents.mdx`、`tools.mdx`、`handoffs.mdx`、`sessions.mdx`、`guardrails.mdx`、`tracing.mdx` 和 `testing.mdx`。阅读时对照本项目的 Agent Kernel、Thread、Policy 和 Trace 边界，不把 SDK 的具体 API 当作通用架构定义。

这六个 lesson **没有实现 session 续接或 guardrail**，并且都调用 `setTracingDisabled(true)`。要观察这些能力，需要另写实验或运行该 SDK 检出版本相应的示例。特别是敏感工具的执行许可应由审批或运行时策略控制，不能仅以提示词或普通 guardrail 代替；参见[官方安全控制说明](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)。

完成选修实验后，记录一次真实运行：使用的检出版本、模型与接口（不要记录 Key），每课的输入、实际工具或 handoff 日志、最终输出，以及一次模型没有按预期选择工具时的观察。这样即可区分 SDK 机制、示例脚本的行为和模型的非确定性。
