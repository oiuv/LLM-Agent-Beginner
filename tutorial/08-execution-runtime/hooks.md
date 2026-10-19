# Hooks：把运行时规则接入生命周期

> 前置知识：Agent Kernel、Tools、Skills 与执行运行时
>
> 里程碑：实现工具前拦截、完成前验收和有界收尾，并解释每种 Hook 的权限

## 为什么不能只写进 Skill

学习 Skill 可以要求“只使用本课资源，回答前检查引用”，但模型可能漏做。把检查散落到每个 Tool，又会造成重复和不一致。

Hook 是宿主在明确生命周期节点触发的处理器。模型不用先选择一个 Hook，运行时到达该节点就调用它。这样，资源范围检查、答案验收和指标记录可以独立维护。Skill 提供上下文与工作流程；Tool 提供动作；MCP 标准化能力连接；Hooks 提供运行时扩展点。完整分工见 [课程总览](../00-course-overview/README.md#扩展机制各管什么)。

Hooks 适合跨任务复用的检查和观察；主业务流程仍放在 Workflow，核心权限、审批和预算仍由 Runtime 执行。仅把安全要求写成 Hook，并不能证明所有动作都经过了它。

## 先区分观察与控制

| 类型 | 典型用途 | 本教程的失败处理 |
|---|---|---|
| 观察型 | 记录耗时、统计结果、释放运行期资源 | 记录错误后继续，不能修改 Outcome |
| 控制型 | 执行前拦截、完成前验收 | 明确拒绝按事件处理；异常、无效返回或超时使 Run 失败 |

观察型不等于后台异步：本例等待每个回调，但设有截止时间。必须成功的合规检查应使用控制型入口或核心策略，不能注册成“失败也继续”的日志回调。

## 教学运行时的五个事件

以下名称和契约由本项目定义，并非 Claude Code、Codex 或 MCP 的通用协议。

| 事件 | 触发时机与数据 | 能改变什么 |
|---|---|---|
| RunStart | 一次 Run 开始，提供 traceId、threadId、userId | 仅观察 |
| BeforeToolCall | 参数校验、权限和审批通过后，提供调用 ID、工具名、校验后的参数 | continue 或 block；不改参数、不授予权限 |
| AfterToolCall | 已开始的工具执行返回或抛错后，提供调用与归一化结果 | 仅观察；不能撤销副作用 |
| BeforeFinish | 模型提出最终答案时，提供 answer 和从 1 开始的 attempt | continue 接受；block 将原因交给模型修正 |
| RunEnd | 本次 run() 即将返回 completed、waiting、failed 或 cancelled | 仅观察最终 Outcome，不能重新启动循环 |

~~~text
RunStart → 模型决策
             ├─ 工具提案 → 调用预算 → Schema → Policy → Approval
             │                                     ↓
             │                              BeforeToolCall
             │                                ├─ block → 错误反馈
             │                                └─ continue → Tool → AfterToolCall
             │                                                      ↓
             │                 下一轮模型 ←──────────────────────────┘
             ├─ 候选答案 → BeforeFinish
             │               ├─ block → 带原因修正（仍受 maxSteps 限制）
             │               └─ continue → completed
             └─ 信息不足 / 审批等待 / 错误 / 取消 → 对应 Outcome
所有返回路径 → RunEnd
~~~

被 Schema、Policy、Approval 或 BeforeToolCall 拦下的工具没有实际执行，因此不会产生 AfterToolCall。已经开始的工具即使抛错，也会以错误结果触发它。工具本身必须返回或抛错才能到达这个节点。

RunEnd 表示本次函数调用结束，waiting 也会触发。它不表示整个 Thread 或产品会话关闭；进程崩溃也不能保证回调运行。持久审计与恢复仍需数据库和 Checkpoint。

## 最小实现怎样使用

源代码：[RuntimeHooks](../../examples/learning-agent-runtime/src/hooks.ts)、[Kernel](../../examples/learning-agent-runtime/src/agent.ts)、[ToolExecutor](../../examples/learning-agent-runtime/src/tools.ts)。

~~~ts
const hooks = new RuntimeHooks(traces);

hooks.addGuard("BeforeFinish", {
  id: "goal.verify",
  timeoutMs: 1000,
  handle: ({ answer }) => {
    const check = verifyStudyPlan(answer, goal, resources);
    return check.passed
      ? { effect: "continue" }
      : { effect: "block", reason: check.feedback };
  },
});

const kernel = new AgentKernel(model, registry, executor, traces, {
  maxSteps: 3,
  maxToolCalls: 2,
  systemInstruction: "依据证据生成学习计划。",
  hooks,
});
~~~

这就是 [学习计划工作流](../../examples/learning-agent-runtime/src/study-workflow.ts) 的答案验收入口。验收函数负责领域约束，BeforeFinish 负责何时检查，Kernel 负责反馈和停止。没有配置完成检查时，completed 只表示运行闭环正常结束。

Kernel 把同一 RuntimeHooks 传给 ToolExecutor。单独使用执行器时，通过 execute 的第五个参数传入它；直接调用 Tool.execute 不会经过这些扩展点，应用应统一走执行器。

## 执行规则与边界

1. **顺序固定。** 同一事件按注册顺序串行执行；控制型首个 block 会结束本轮检查。注册在启动阶段完成，ID 唯一。
2. **拒绝与故障不同。** BeforeToolCall 的 block 返回 HOOK_BLOCKED，工具执行次数为零；模型可根据反馈调整提案。BeforeFinish 的 block 允许有限修正。检查器异常或超时直接使 Run 失败，不能当成验收通过。
3. **数据隔离。** 每个处理器收到独立快照，接口只读；修改副本不会改动批准后的参数、工具结果或后续 Hook 的输入。事件载荷应使用可克隆的普通数据。
4. **时间有界。** 每个 Hook 默认 1000 ms，可单独配置。超时后发送 AbortSignal，忽略迟到结果；处理器也应把 signal 传给异步操作。进程内计时器不能中断同步死循环，也不能撤销已经提交的副作用。执行不可信脚本需要独立进程与沙箱。
5. **取消不再验收。** 取消中的控制型检查退出，Kernel 返回 cancelled。AfterToolCall 和 RunEnd 使用各自的有限等待时间完成观察；它们不能把取消转成继续执行。
6. **防止结束循环。** BeforeFinish 每次拒绝都消耗模型步数，attempt 可辅助记录重复检查。RunEnd 只观察一次，不调用 BeforeFinish。不要在处理器内递归启动同一个 Run。
7. **保留证据。** Trace 记录 Hook ID、事件、started/终态、结果类别与耗时；默认不写入完整参数、答案和异常正文。详细审计应另做脱敏与访问控制。

这些回调是受信任的应用代码；快照只能隔离事件数据，不能限制回调通过闭包、文件或网络获得的权限。钩子内执行外部动作时，同样需要权限、幂等和副作用管理。

## 参考 Claude Code 与 Codex

官方学习入口，建议按以下顺序阅读：

1. [Claude Code Hooks 入门指南](https://code.claude.com/docs/en/hooks-guide)：从第一个 Hook 配置和常见自动化场景开始。
2. [Claude Code Hooks 完整参考](https://code.claude.com/docs/en/hooks)：查阅生命周期事件、匹配规则、输入输出、决策控制与故障处理。
3. [Codex Hooks 官方文档](https://learn.chatgpt.com/docs/hooks)：学习配置位置、信任机制、事件契约与工具覆盖，再对照两者差异。

先在入门指南中跑通一个简单 Hook，再查对应事件的完整契约，最后与本教程的运行时实现比较。

以下按 **2026-10-19 查阅的官方文档**说明本地运行时设计。配置和事件支持可能变化，使用时核对实际版本及环境；本项目未实现这两个产品的配置加载器或协议适配器。

Claude Code 展示了 SessionStart、PreToolUse、PostToolUse、PostToolUseFailure、Stop 等扩展点。成功与失败的工具结果可以分开订阅；Stop 可要求继续，并通过 stop_hook_active 标记已经续跑的情况。同一事件的匹配处理器并行运行，不能依赖配置顺序。命令及 HTTP Hook 可用 onFailure 设置故障处理，具体支持有版本要求。

Codex 也提供工具前后、Stop、Interrupt 等事件，同一事件的匹配命令 Hook 并发启动。Stop 的 block 会继续当前任务，Interrupt 的输出不能阻止中断。工具 Hook 覆盖有例外，例如 hosted WebSearch；PreToolUse 使用不支持的返回字段可能导致检查失败后继续调用。因此，事件名相近不代表执行覆盖和失败语义相同。

借鉴时关注三件事：

- **匹配与返回契约：** 明确监听哪个事件、哪些工具，返回值对该事件到底是“拒绝动作”“追加上下文”还是“继续任务”。本例只按事件注册，工具过滤写在处理器内。
- **完成与收尾分开：** 教学 BeforeFinish 借鉴 Stop 的验收用途；RunEnd 是本例每次调用的最终观察点，不与产品 SessionEnd 等同。
- **落实到实际行为：** 用一个应通过、一个应拒绝、一个检查器故障的用例验证配置。不能仅凭配置存在、脚本退出或同名事件就认定控制已生效。

本例刻意采用串行、控制型故障关闭的简单规则，方便学习与测试；不要把它直接套作两个产品的默认行为。PostToolUse 发生在动作之后，即使反馈被拒绝，也不代表动作已回滚。

插件可以携带宿主专属 Hook 配置，但 Agent Plugins 1.0.0 没有统一 Hook 组件契约，见 [插件扩展边界](../16-agent-plugins/01-package-format.md#hooks-放在哪一层)。

## 运行实验与验收

在仓库根目录运行：

~~~sh
npm run tutorial:hooks
npm test
~~~

[完整实验](../../examples/learning-agent-runtime/src/hooks-demo.ts) 使用 ScriptedModel 和模拟资源，无需 API Key。预期四次模型决策、一次实际工具执行：

1. 第一个资源请求越出课程范围，被 BeforeToolCall 拦下。
2. 修正后的请求执行成功；AfterToolCall 指标处理器故意报错，任务仍继续。
3. 第一个候选答案缺引用，被 BeforeFinish 退回。
4. 第二个候选答案通过，RunEnd 观察到 completed。

[测试集](../../examples/learning-agent-runtime/src/hooks.test.ts) 覆盖权限与审批、异常、超时、迟到结果、快照隔离、取消、顺序和终态；[架构测试](../../examples/learning-agent-runtime/src/patterns.test.ts) 验证学习计划验收的失败反馈与有限修正。

练习：增加“工具耗时统计”和“计划必须覆盖指定知识点”两种 Hook，解释为何分别属于观察和控制。验收时既检查最终结果，也断言被拒动作的执行次数为零，日志失败不改变结果，取消后没有新的模型调用。

后续再按需要增加上下文注入、压缩、子 Agent 事件和外部脚本适配；不要为完整事件清单提前扩大最小运行时。安全评测接着看 [阶段 13](../13-safety-evaluation/README.md#hooks-回归)。
