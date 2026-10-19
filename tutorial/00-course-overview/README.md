# 阶段 0：认识完整 Agent 系统

> 前置知识：会阅读基础 TypeScript  
> 里程碑：能区分聊天、工作流、工具助手和自主 Agent

## 学习目标

- 理解 Agent 的必要组成和职责边界；
- 掌握 Thread、Run、Turn、Task、Tool Call 等核心对象；
- 能判断一个需求是否真的需要 Agent；
- 能画出指导学习 Agent 的完整生命周期。

## 从聊天到 Agent

四类系统经常被混用：

| 类型 | 决策方式 | 状态 | 外部动作 | 适合场景 |
|---|---|---|---|---|
| Chatbot | 模型生成回复 | 对话历史 | 通常没有 | 问答、改写、总结 |
| Workflow | 代码预先定义步骤 | 流程状态 | 固定动作 | 稳定、重复业务 |
| Tool Assistant | 模型选择少量工具 | 会话状态 | 有 | 搜索、查询、计算 |
| Agent | 围绕目标动态规划和执行 | 运行状态，可按需持久化 | 有且受治理 | 开放式多步任务 |

是否使用 Agent，应看任务是否同时具备开放目标、动态决策、多步反馈和外部行动。固定表单审批不需要 Agent；“分析薄弱知识点、生成计划、每日跟踪并调整”适合 Agent。

## Agent 的最小闭环

~~~
Observe：读取用户输入、记忆和环境
Think：理解状态并判断下一步
Act：回答、调用工具、请求确认或委派
Observe：接收动作结果
Repeat：继续、重规划或结束
~~~

这个闭环必须由运行时控制。模型只负责产生候选决策，不能直接获得文件系统、数据库或账号权限。

## 完整系统分层

1. 感知层：文本、语音、图片、屏幕和设备上下文。
2. 上下文层：Thread、记忆、Skill、工具描述和当前任务状态。
3. Agent Kernel：目标、策略、规划、循环和停止条件。
4. 能力层：Tool Registry、MCP Client、Connector、Skill Runner。
5. 执行层：校验、权限、审批、沙箱、重试、取消和生命周期 Hooks。
6. 状态层：Memory、Thread、Task、Checkpoint、Artifact。
7. 控制面：Scheduler、Event Bus、Queue、Worker、多 Agent 调度。
8. 治理面：安全、评测、追踪、成本、审计和数据生命周期。

## 扩展机制各管什么

| 机制 | 负责的问题 | 学习 Agent 示例 |
|---|---|---|
| Skills：上下文与工作流程 | 一类任务按什么方法完成 | 加载“诊断薄弱点 → 选资源 → 安排复习”的步骤与约束 |
| Tools：工具扩展 | 能执行什么具体动作 | 读取错题、保存笔记、生成测验 |
| MCP：能力连接标准 | 怎样统一发现和访问外部能力 | 连接资源库；除 Tools 也包括 Resources、Prompts |
| Hooks：运行时管理扩展点 | 在哪些生命周期节点观察、检查或干预 | 工具前检查范围、完成前验收、结束时记录状态 |
| Plugins：能力封装与分发 | 怎样组合已有能力并交给宿主加载 | 学习导师插件封装诊断 Skill、练习 Skill 和 MCP 配置 |

它们可组合使用：Skill 指导模型选择动作，Tool 通过本地接口或 MCP 提供能力，Runtime 在事件节点执行 Hooks，并落实权限、预算与停止条件。Hooks 不替代整个 Runtime，也不依赖模型主动调用。Hooks 实现放在 [阶段 8](../08-execution-runtime/hooks.md)，标准插件与市场边界放在 [阶段 16](../16-agent-plugins/README.md)。

## 核心对象模型

| 对象 | 职责 |
|---|---|
| Thread | 同一用户目标的连续上下文与状态引用 |
| Run | 一次被用户、时间或事件触发的执行 |
| Turn | 一轮观察与决策 |
| Task | 可独立跟踪、调度和验收的工作 |
| Observation | 带来源、类型与时间的输入或执行结果 |

实际接口见 [types.ts](../../examples/learning-agent-runtime/src/types.ts) 与 [stores.ts](../../examples/learning-agent-runtime/src/stores.ts)。Task、持久 Checkpoint 和完整 Run Store 属于后续练习；不要为教程另外维护一份不同的核心类型。

重要对象需要稳定 ID，才能回答“哪个任务失败了”“哪个调用生成了文件”。最小 Agent 可只保存当前运行状态，跨会话或后台任务再引入持久化。

## Agent 一次运行的生命周期

1. 接收输入或触发事件。
2. 根据 threadId 加载 Thread。
3. 新建 Run 并保存 trigger。
4. 构建当前上下文。
5. 调用模型产生 Action。
6. 运行时校验 Action。
7. 执行动作并记录 Observation。
8. 更新工作记忆、计划和学习者模型。
9. 达到停止条件后生成 Artifact 或回复。
10. 保存 Checkpoint、Trace 和下一次触发条件。

## 设计原则

- 模型可替换：Agent Kernel 不绑定某个模型 API。
- 工具最小权限：模型只看到被允许的能力。
- 状态显式：重要状态不能只藏在 Prompt 中。
- 所有副作用可追踪：写文件、发消息和修改数据都产生事件。
- 默认单 Agent：只有角色或权限确实需要隔离时才引入多 Agent。
- 失败是正常路径：超时、拒绝、取消、重试必须进入数据模型。
- 教学效果优先：学习 Agent 的成功不是“回复很像老师”，而是学习状态改善。

## 常见错误

1. 把任意 LLM 应用都叫 Agent。
2. 用大段 Prompt 代替任务状态机。
3. 把 MCP 当作规划器或记忆系统。
4. 把对话历史当作全部长期记忆。
5. 在没有单 Agent 基线前引入多智能体。

## 练习与验收

基础练习：为“每天检查错题并安排复习”画出对象和事件流。

设计练习：解释为什么 Scheduler 应在模型循环之外。

验收标准：

- 能说明 Tool、MCP、Skill、Hook、Plugin、Memory 和 Scheduler 的不同职责；
- 能为一次用户请求标出 Thread、Run、Turn；
- 能列出至少三个非模型组件；
- 能判断三个具体需求是否需要 Agent。

## 下一步

进入 [LLM 应用基础](../01-llm-foundations/README.md)，用同一学习计划任务观察架构怎样随失败案例逐步演进。
