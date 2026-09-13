# 06｜错误、重试与结果边界

Client 至少区分四种情况：JSON-RPC error、工具结果 isError、input_required、传输失败。它们要求不同的 Agent 决策，不能统一转换为“再试一次”。

| 情况 | 例子 | 合理处理 |
|---|---|---|
| JSON-RPC error | 未知方法、请求结构不合法、不支持版本 | 修正调用或终止 |
| 工具 isError | 城市不存在、业务规则拒绝 | 把可读信息交给 Agent，考虑改参 |
| input_required | Server 请求补充表单/确认 | Host 处理 inputRequests，用 inputResponses 继续 |
| 传输失败 | HTTP 断开、子进程退出 | 检查调用是否可能已执行，再决定重发 |

标准 JSON-RPC 错误有 code、message、可选 data；工具业务错误留在 tools/call 的 result，且正常结果仍遵循 resultType。MRTR 的 input_required 是协议定义的继续路径，并不是失败。字段以 [schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts) 为准；语义见 [2026-07-28 server/tools.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/tools.mdx)、[2026-07-28 basic/patterns/mrtr.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/mrtr.mdx)。

HTTP 网络中断时无法仅凭断开判断工具是否已执行。对有副作用的动作，应由应用设计幂等键、状态查询或用户确认。版本不支持时只在明确的兼容策略下回退；不能把 SDK v2 的旧协议成功响应当成 2026 成功。传输要求见 [2026-07-28 basic/transports/streamable-http.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)。

## 练习

让一个加法工具在输入超界时返回 isError，再用不存在的工具名触发协议 error。记录两种响应的形状，解释 Agent 下一步为何不同。

## 工具错误的示意

~~~json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "日期格式错误，请使用 YYYY-MM-DD"}],
    "isError": true
  }
}
~~~

这里外壳仍是 JSON-RPC result，因为找到了工具并执行了校验。Client 应把可修正的错误文本交给 Agent。未知工具名或损坏的请求结构则属于协议 error。Server 故障也可能成为协议 error；网络中断根本没有可解析的 MCP 响应。

## 重试矩阵

| 观察 | 是否可直接重试 | 需要先确认 |
|---|---|---|
| 只读工具超时 | 视应用策略而定 | 超时预算、限流 |
| 写操作响应丢失 | 通常不能 | 是否已经执行、幂等键 |
| input_required | 按 MRTR 继续 | 输入请求与 requestState |
| 参数格式错误 | 修正后再试 | 工具说明与 Schema |
| 不支持协议修订 | 按兼容策略处理 | 实际回退修订 |

### 验收

对一个“创建笔记”工具的响应丢失，先设计按业务 ID 查询是否已创建的步骤，再决定是否重新发起。仅重建 HTTP 连接不足以保证不重复创建。
