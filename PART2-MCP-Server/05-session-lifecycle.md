# 05｜无协议会话的请求生命周期

2026-07-28 移除了协议级 session、initialize/initialized 与 Mcp-Session-Id。Server 不能以“已经初始化”作为接收 tools/list 或 tools/call 的前置条件。每个请求都带自身的协议修订与 Client 能力；server/discover 可供发现，但不是必经握手。依据 [规范：changelog.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/changelog.mdx) 和 [规范：basic/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/index.mdx)。

## 请求与业务状态

一次请求依次经历：传输接收 → 解析 JSON-RPC → 验证版本和参数 → 执行业务 → 生成 complete/input_required 或 error → 发送响应。HTTP 连接可以结束，而业务状态仍由应用持有。跨调用工作流若需要状态，Server 应签发明确的业务句柄，并验证所有者、有效期及幂等性；不能借用协议 Session ID。

MRTR 的 input_required 让 Client/Host 补充信息，再携带 inputResponses 重发原方法。工具若已产生副作用，应通过业务句柄防止重复执行。参见 [规范：basic/patterns/mrtr.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/mrtr.mdx)。

## 传输关闭

stdio 子进程结束或 HTTP 请求断开，只说明传输状态。无法由断开推断动作未执行。Server 应有业务日志或状态查询支撑安全重试；Client 见 [连接管理](../PART3-MCP-Client/02-connection-management.md)。

## 练习

设计“提交订单前确认”的两轮交互，画出第一次 input_required、用户确认、第二次 inputResponses。说明订单 ID 在哪里生成，如何避免网络重试造成两笔订单。

## 协议状态与业务状态

“无协议会话”不等于 Server 不能存数据。笔记库、订单库或任务状态仍由应用保存；区别在于 Client 不再用 Mcp-Session-Id 作为协议层隐含上下文。业务需要连续操作时，应把 noteId、orderId 等可验证的句柄放在业务参数中，并检查其所有者及有效期。

### 两轮确认示例

~~~text
第 1 次 tools/call(create_order, cart)
→ input_required，返回确认请求或不透明 requestState
Host 展示订单摘要并取得确认
第 2 次 tools/call(create_order, cart, inputResponses, requestState)
→ complete，返回明确 orderId
~~~

`inputResponses` 与 `requestState` 在请求参数中的具体结构以 [MRTR schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts) 为准。Client 原样传回 requestState，不解析或修改。若第 2 次请求的响应丢失，Client 应先按业务键查状态，而不能直接创建第二单。

### 验收

列出该交互中哪些是 MCP 字段，哪些是应用字段。指出一个能防止重复订单的业务键及 Server 校验规则。
