# 02｜JSON-RPC 与 MCP 消息封装

MCP 使用 JSON-RPC 2.0 的请求、响应和通知。请求有 id、method、可选 params；响应复用 id，且只能含 result 或 error 之一；通知没有 id，因此不等待响应。JSON-RPC 2.0 与 MCP 2026-07-28 是不同层次的版本。

## 请求的自包含上下文

2026 版的普通 Client 请求在 params._meta 中携带 io.modelcontextprotocol/protocolVersion 与 io.modelcontextprotocol/clientCapabilities，建议携带 io.modelcontextprotocol/clientInfo。下面的对象展示 tools/call 的关键字段；完整校验规则见 [schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts) 和 [2026-07-28 basic/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/index.mdx)。

~~~json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "add",
    "arguments": {"a": 1, "b": 2},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {"name": "lesson-client", "version": "1.0.0"}
    }
  }
}
~~~

一个正常工具响应的 result 含 resultType=complete，并可含 content、structuredContent、isError。列表及资源读取结果还需要 ttlMs 和 cacheScope。SDK 会处理这些封装字段，示例应用只填业务参数。

## 错误边界

未知方法、请求结构错误或不支持的修订使用 JSON-RPC error。工具已被找到并执行，但业务失败时，应返回工具结果并设置 isError；Agent 可读取说明，决定修正输入或终止。传输断开属于第三类失败，不能据此推断工具未执行。更多见 [错误处理](06-error-handling.md)。

## 练习

把上例的工具名改为不存在的名称，再把 add 的整数值改成超出业务范围。比较协议 error 与工具 isError，并解释响应中的 id 为什么必须与请求相同。

## 拆开一条响应

下面的结果与上文请求 id=1 对应。resultType 属于 MCP 结果，jsonrpc/id/result 属于 JSON-RPC 响应外壳：

~~~json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "3"}],
    "structuredContent": {"result": 3}
  }
}
~~~

工具调用结果通常由模型阅读 content，应用程序优先读取结构化结果。缺少 id 的对象如果是通知，不能被当成这个请求的响应。Client 同时发多个请求时，id 用于配对；不应假设响应顺序必与请求顺序相同。

## 方法错误与工具输入错误

若 method 根本不存在、工具名不存在或 JSON-RPC 请求形状不符合 CallToolRequest，Server 使用协议 error。若工具已被找到，但输入值不满足该工具的范围/格式校验，规范把它归为工具执行错误，宜在 tools/call 结果中设置 isError=true，让模型得到可修正的反馈。两种错误的分界以 [官方工具规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/tools.mdx) 为准。

### 验收

记录 add 的完整响应外壳，而非只记 `3`。指出 id、resultType、content、structuredContent 各服务于哪一层；再分别设计“未知工具名”和“整数越界”的错误反馈。
