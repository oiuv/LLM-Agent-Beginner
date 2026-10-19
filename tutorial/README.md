# 从零开发 Agent

以指导学习 Agent 为贯穿案例：先能完成一次可验证任务，再增加跨会话状态、后台执行和运营能力。章节描述目标架构；可直接运行的能力以 [示例说明](../examples/learning-agent-runtime/README.md) 为准。

## 课程路线

| 阶段 | 核心问题 | 学习产出 |
|---|---|---|
| [0 · 课程总览](00-course-overview/README.md) | 什么需求需要 Agent | 系统边界与生命周期图 |
| [1 · LLM 应用基础](01-llm-foundations/README.md) | 怎样可靠使用模型 | 统一接口与结构化输出 |
| [2 · Tool Calling](02-tool-calling/README.md) | 模型如何提出动作 | 校验、执行、结果回传 |
| [3 · Agent Kernel](03-agent-kernel/README.md) | 谁控制循环与停止 | 有边界的单 Agent |
| [4 · 规划与工作流](04-planning-workflow/README.md) | 什么时候需要更复杂的路径 | 路由、并行、验收与重规划 |
| [5 · Tools、MCP 与 Connectors](05-tools-mcp-connectors/README.md) | 怎样连接外部能力 | MCP Server、Client 与权限边界 |
| [6 · Skills](06-skills/README.md) | 怎样复用任务方法 | 按需发现、加载与评测 |
| [7 · Memory 与 Thread](07-memory-thread/README.md) | 怎样记住事实并续接任务 | 状态、记忆与检索边界 |
| [8 · 执行运行时](08-execution-runtime/README.md) | 怎样处理动作的风险与失败 | 审批、恢复、预算与交付物 |
| [9 · 调度与持久任务](09-scheduling/README.md) | 谁决定何时执行 | 事件去重、优先级与恢复 |
| [10 · 多模态输入](10-multimodal/README.md) | 怎样统一不同输入 | 带来源的 Observation |
| [11 · 多智能体](11-multi-agent/README.md) | 何时值得委派 | 权限隔离、汇总与成本比较 |
| [12 · 指导学习 Agent](12-learning-agent/README.md) | 怎样形成教学闭环 | 有证据的学习者状态 |
| [13 · 安全与评测](13-safety-evaluation/README.md) | 怎样证明任务有效完成 | 分层评测、Trace 与回归集 |
| [14 · 生产化](14-production/README.md) | 怎样部署和持续改进 | 运行边界、故障演练与版本发布 |
| [15 · 毕业项目](15-capstone/README.md) | 怎样整合能力 | 可验收的学习 Agent |
| [16 · 专家包与生态](16-expert-packaging/README.md) | 怎样封装专家定义 | 包、用户绑定与运行状态的设计 |

## 学习节奏

| 里程碑 | 范围 | 验收重点 |
|---|---|---|
| 最小闭环 | 0～3 | 模型提出动作，运行时校验执行，有停止条件 |
| 多步任务 | 4～8 | 明确依赖、证据、权限和交付物 |
| 持续执行 | 9 | 事件去重、租约、预算和恢复 |
| 学习产品 | 10～12 | 按需接入多模态与委派，以证据更新学习状态 |
| 可运营系统 | 13～15 | 任务评测、故障演练、成本和数据生命周期 |

先运行 `npm run tutorial`，再用 `npm run tutorial:patterns` 观察约束失败、有限修正、预算耗尽和优先级。实验说明见 [从单次提示到工作流](01-llm-foundations/from-prompt-to-workflow.md)。复杂度应由失败案例推动；简单需求可以停留在固定工作流。

## 系列边界

- 模型内部结构、训练、微调、对齐：[Transformer 教程](https://github.com/oiuv/LLM-Transformer-Beginner)。
- 切分、Embedding、向量库、混合检索、重排及 RAG 评测：[Embedding 教程](https://github.com/oiuv/LLM-Embedding-Beginner)。
- 本教程在模型和检索服务之上讲运行时控制；[Agentic Retrieval](07-memory-thread/agentic-retrieval.md) 只讨论检索决策与证据使用。

## 设计模式怎样融入课程

参考 [Agentic Design Patterns 中文版](https://ningg.top/Agentic-Design-Patterns-CN/)：

| 模式 | 本教程落点 |
|---|---|
| Prompt Chaining、Routing、Parallelization | 阶段 1 的递进案例与阶段 4 的依赖编排 |
| Reflection、Planning、Goal Setting and Monitoring | 阶段 4 的外部验收、有限修正与动态规划 |
| Exception Handling、Human-in-the-loop、Resource-aware Optimization | 阶段 8 的恢复选择、人工介入与预算 |
| Prioritization | 阶段 9 的就绪任务排序 |
| Learning and Adaptation、Evaluation and Monitoring | 阶段 12～14 的证据、反馈与发布 |

模式用于解释架构选择，不代表要把所有模式装进同一个 Agent。A2A 和自主探索可在有跨系统协作需求后研究，不是入门前置。

术语见 [GLOSSARY.md](GLOSSARY.md)。贡献时使用 [章节模板](CHAPTER-TEMPLATE.md)，先解释具体失败，再给最小改进与可观察验收。
