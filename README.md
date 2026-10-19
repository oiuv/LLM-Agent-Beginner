# LLM Agent 开发入门

从一次模型调用出发，围绕“指导学习 Agent”逐步理解工具、Skills、Hooks、插件、规划、状态和调度为什么需要独立设计，并用 TypeScript 验证关键行为。

## 系列分工

| 教程 | 重点 |
|---|---|
| [LLM Transformer Beginner](https://github.com/oiuv/LLM-Transformer-Beginner) | 模型原理、训练、微调与对齐 |
| [LLM Embedding Beginner](https://github.com/oiuv/LLM-Embedding-Beginner) | Embedding、检索、重排与 RAG 质量 |
| **本教程** | Agent 的决策循环、工具执行、状态管理与工程治理 |

需要检索知识时，本教程讲“何时检索、如何使用证据、何时停止”，检索系统的实现交给 Embedding 教程。

## 开始学习

1. 阅读 [课程路线](tutorial/README.md)，按阶段 0～15 学习；阶段 16 学习标准插件封装与分发。
2. 运行统一的 [学习 Agent 示例](examples/learning-agent-runtime/README.md)。
3. 对照每章的失败案例、练习和验收标准补齐系统。

在项目根目录运行（Node.js 18+）：

~~~sh
npm install
npm test
npm run tutorial
npm run tutorial:patterns
npm run tutorial:hooks
npm run check:docs
npm run check:plugins
~~~

示例默认使用 ScriptedModel，不需要 API Key。它验证控制流、Hooks、校验、预算和调度行为；真实模型质量与教学效果需要独立评测。

## 项目结构

- [tutorial/](tutorial/README.md)：唯一课程入口；深入阅读归入对应阶段。
- [examples/](examples/README.md)：学习 Agent、MCP 实验与标准插件样例。
- [Hooks 运行时管理](tutorial/08-execution-runtime/hooks.md)：生命周期、拦截、验收与收尾。
- [术语表](tutorial/GLOSSARY.md)：统一核心概念。
- [章节模板](tutorial/CHAPTER-TEMPLATE.md)：贡献章节的写作与验收要求。

示例当前使用内存存储。持久化审批、跨进程恢复、多模态适配器和插件安装器属于课程练习或设计目标，具体范围见 [示例说明](examples/learning-agent-runtime/README.md)。

设计模式阅读参考 [Agentic Design Patterns 中文版](https://ningg.top/Agentic-Design-Patterns-CN/)。本教程按问题出现的顺序引入模式，每增加一个组件都说明收益、成本与停止条件。
