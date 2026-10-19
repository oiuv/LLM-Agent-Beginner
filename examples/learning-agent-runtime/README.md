# Learning Agent Runtime

供应商无关的 TypeScript 教学运行时，以 ScriptedModel 提供确定性决策，验证系统怎样执行和停止。

## 运行

仓库根目录：

~~~sh
npm install
npm run tutorial
npm run tutorial:patterns
npm test
~~~

在本目录也可运行 npm run demo、npm run patterns 和 npm test。所有默认实验无需 API Key。

## 代码地图

| 文件 | 职责 |
|---|---|
| [types.ts](src/types.ts) | 模型、工具、输入、结果与事件类型 |
| [model.ts](src/model.ts) | ScriptedModel 测试替身 |
| [agent.ts](src/agent.ts) | 决策循环、答案验收、步数与调用预算 |
| [tools.ts](src/tools.ts) | 工具注册、参数校验、策略和执行 |
| [stores.ts](src/stores.ts) | 内存 Thread、Memory、Artifact |
| [skills.ts](src/skills.ts) | 元数据索引、依赖检查与惰性加载 |
| [scheduler.ts](src/scheduler.ts) | 一次性/事件触发、去重、优先级与租约 |
| [learning.ts](src/learning.ts) | 基于证据的简化学习状态 |
| [study-workflow.ts](src/study-workflow.ts) | 路由、独立读取与学习计划验收 |
| [patterns.ts](src/patterns.ts) | 架构模式实验入口 |
| [runtime.test.ts](src/runtime.test.ts)、[patterns.test.ts](src/patterns.test.ts) | 正常、失败、取消与预算回归 |

## 能力边界

| 当前已实现 | 尚需完成的工程练习 |
|---|---|
| model → tool → model 的实际控制流 | 真实厂商 SDK 适配与模型质量评测 |
| 内存状态与乐观版本检查 | 数据库、跨进程恢复与多端同步 |
| 写入及外部动作返回 waiting/approval | 持久审批记录、参数绑定与恢复执行 |
| 一次性与事件 Job、进程内去重和租约 | cron、持久队列、Checkpoint、取消 Job |
| Skill 查找与加载 | SKILL.md 文件解析、SkillRunner |
| 可插拔答案验收与调用次数预算 | token/金额/总时限预算与真实用量结算 |
| 基于证据的数值更新 | 证据去重、教学策略与长期学习效果验证 |

maxSteps 默认 8，maxToolCalls 默认 16；工具预算统计提案尝试，包含被拒绝的调用。预算在每次工具执行前检查，因此一批调用也受限制。

未配置 verifyAnswer 时，completed 表示模型给出最终答案且本轮正常结束；配置后还须通过相应验收。学习计划验收仅检查覆盖、分钟数与资源归属，不能证明教学质量。

优先级只影响已就绪 Job 的领取，数值越大越先领取，同优先级按 availableAt；不抢占有效租约，也没有防饥饿机制。租约测试模拟同一进程中的 Worker 接管，不证明重启后恢复。

审批示例只用 callId 表示本次允许的调用，不是生产审批凭证。工具取消是协作式的，已经提交的副作用不会自动回滚。

## 怎样使用实验

先阅读 [递进案例](../../tutorial/01-llm-foundations/from-prompt-to-workflow.md)，再改变失败输入。ScriptedModel 证明规则与控制流能够执行，不证明真实模型会主动修正，也不证明学生学习效果改善。

接入真实模型时实现 ModelProvider，并处理厂商消息格式、工具关联、错误、用量和取消。生产能力按 [毕业项目](../../tutorial/15-capstone/README.md) 分步补齐。
