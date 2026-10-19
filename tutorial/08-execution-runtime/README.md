# 阶段 8：执行运行时

> 前置知识：阶段 2、3、5、7  
> 里程碑：工具动作具备权限、审批、超时、取消、幂等和交付物管理

## 模型提出动作，Runtime 承担后果

执行运行时位于 Agent Kernel 与真实系统之间。它不能被某个 Tool、MCP Server 或 Skill 绕过。

~~~
ProposedToolCall
  ↓ Schema Validator
  ↓ Policy Engine
  ↓ Approval Gate
  ↓ Quota / Budget
  ↓ Executor / Sandbox
  ↓ Result Normalizer
  ↓ Artifact Store + Trace
~~~

## Tool Call 记录

~~~ts
interface ToolCallRecord {
  id: string;
  runId: string;
  toolName: string;
  toolVersion: string;
  arguments: unknown;
  idempotencyKey?: string;
  status: "proposed" | "approved" | "running" | "succeeded" | "failed" | "cancelled";
  startedAt?: string;
  finishedAt?: string;
  resultRef?: string;
  error?: { code: string; retryable: boolean };
}
~~~

记录必须在执行副作用之前落库，否则进程崩溃后无法判断动作是否已经发生。

## Policy Engine

策略输入至少包含：

- 用户、租户和角色；
- Tool 名称、版本、参数和副作用等级；
- 当前 Thread、Task 和 Skill；
- 目标资源和数据敏感级别；
- 设备、网络和运行环境；
- 当前预算和审批记录。

输出：

~~~ts
type PolicyDecision =
  | { effect: "allow" }
  | { effect: "deny"; reason: string }
  | { effect: "require_approval"; summary: string; expiresAt: string };
~~~

模型可以解释请求，不能决定策略最终结果。

## 当前实现与工程目标

[ToolExecutor](../../examples/learning-agent-runtime/src/tools.ts) 已实现参数校验、基础策略、审批等待与错误归一化；[Kernel](../../examples/learning-agent-runtime/src/agent.ts) 检查最大步数和工具调用次数。持久审批、自动重试、超时、沙箱和跨进程恢复是本章待实现能力。

## Human-in-the-loop

审批需要持久状态：

1. Run 进入 waiting_approval；
2. 保存工具、参数、影响范围和可理解摘要；
3. 通知有权限的审批者；
4. 审批记录包含人、时间、范围和过期时间；
5. 恢复前重新校验工具参数和环境；
6. 执行后记录结果。

不能让用户只回复“是”就批准一个已经变化的调用。

## Timeout、Cancellation 与 Retry

- 每个 Tool 有默认超时和最大超时；
- AbortSignal 从用户取消一路传播到执行器；
- 只有 retryable 错误才重试；
- 写操作重试依赖幂等键；
- 退避包含随机抖动，避免同时重试；
- 达到预算后将错误交给 Kernel 重规划。

取消不是回滚。已经发送的邮件不能通过停止 Promise 撤回，需要补偿动作或清楚告知。

## 失败后怎样选择恢复路径

| 失败 | 下一步 | 前提 |
|---|---|---|
| 短暂网络错误或限流 | 有限退避重试 | 剩余预算足够，副作用可确认或幂等 |
| 当前来源不可用 | 换允许的来源或降级 | 重新检查证据质量，不伪装完整结果 |
| 参数或目标不明确 | 请求澄清 | 问题会改变执行路径 |
| 凭证无效或权限拒绝 | 停止该动作并要求修复 | 不能通过重试或换工具绕过拒绝 |
| 写操作响应丢失 | 查业务状态，再恢复 | 不能把超时当作未提交 |
| 部分步骤已提交 | 继续未完成部分或补偿 | 保存实际结果，补偿也需要权限 |
| 无法可靠判断结果 | 转人工审查 | 提供已知状态、证据与可选动作 |

Human-in-the-loop 还包括补充目标、纠正输入、质量复核和异常接管。选择人类介入的目的要明确，不把所有失败都压成一个“是否继续”。

## 资源预算与降级

预算可以包含模型决策次数、工具尝试次数、token、金额、截止时间和并发量。先用确定性上限，再根据真实用量细化；提示词中的“节省费用”不能执行配额。

示例的 maxSteps 与 maxToolCalls 在执行前检查，拒绝的提案也计入次数。token、金额与总时限尚未实现；真实模型接入后需采集用量并在 Checkpoint 保存剩余预算，恢复不能重新获得完整预算。

预算不足时优先停止非必需查询、缩小范围或请求调整目标；切换较低成本模型后仍执行同一验收器。无法满足最低质量时明确失败，不把降级等同于任务成功。

## Sandbox

对代码、Shell、文件和浏览器工具应限制：

- 可访问目录；
- 网络目标；
- CPU、内存、进程数和运行时间；
- 环境变量与密钥；
- 子进程；
- 输出大小；
- 可安装依赖；
- 可持久化文件。

沙箱不是单一布尔开关，而是一组按工具和任务配置的能力边界。

## Artifact Store

大结果和可交付物不应塞入消息：

~~~ts
interface Artifact {
  id: string;
  threadId: string;
  runId: string;
  kind: "note" | "plan" | "quiz" | "report" | "file";
  name: string;
  mimeType: string;
  storageRef: string;
  checksum: string;
  version: number;
  createdAt: string;
}
~~~

Artifact 需要版本、来源、校验和、权限和生命周期。Tool Result 只保存摘要与 artifactId。

## 错误规范

错误至少区分：

- VALIDATION_ERROR；
- PERMISSION_DENIED；
- APPROVAL_REQUIRED；
- TIMEOUT；
- CANCELLED；
- RATE_LIMITED；
- DEPENDENCY_UNAVAILABLE；
- CONFLICT；
- UNSAFE_OPERATION；
- INTERNAL_ERROR。

错误码驱动重试和重规划，自然语言 message 用于展示。

## 常见错误

1. Tool 内部自行读取管理员密钥。
2. 执行完成后才写 Tool Call 记录。
3. 对所有异常自动重试。
4. 用户取消只停止 UI。
5. 把文件 base64 全量放入模型上下文。

## 练习与验收

给 save_note、send_reminder 和 run_code 实现不同策略：直接允许、需要审批、必须沙箱。

验收标准：

- Tool 无法绕过 Policy Engine；
- 审批可跨进程恢复且会过期；
- 取消信号到达执行器；
- 写操作重复提交不产生两次副作用；
- Artifact 可以追溯到 Run 和 Tool Call。

## 延伸阅读

- [安全与评测](../13-safety-evaluation/README.md)
- [Tool 错误与确认](../05-tools-mcp-connectors/mcp/server/02-tool-definition.md)
