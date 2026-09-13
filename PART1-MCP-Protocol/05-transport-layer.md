# 05｜传输层：stdio 与 Streamable HTTP

传输负责搬运 JSON-RPC 消息。2026 主线有 stdio 与 Streamable HTTP；选型取决于进程位置和部署方式，不改变工具/资源/提示的语义。HTTP+SSE 旧传输已弃用，见 [2025 附录](10-mcp-2026-07-28-upgrade-guide.md)。

## stdio

Host 启动 Server 子进程，stdin 与 stdout 按行传 UTF-8 JSON-RPC。Server 的调试信息写 stderr；写 stdout 会污染协议流。TypeScript SDK v2 使用 serveStdio(factory) 托管新版和兼容连接，示例见 [stdio demo](stdio_demo/README.md)。规范见 [2026-07-28 basic/transports/stdio.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/stdio.mdx)；SDK 入口见 [serveStdio 文档](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/serving/stdio.md)。

## Streamable HTTP

Client 向单一 MCP 端点发 POST；每条 Client 消息独立 POST。请求体是 JSON-RPC，响应可以是单个 JSON 对象或与本请求相关的 SSE 流。HTTP 头的 MCP-Protocol-Version、Mcp-Method 和适用时的 Mcp-Name 与 JSON-RPC params._meta 是不同层。2026 协议不使用 Mcp-Session-Id、旧 GET 推送通道或 SSE 恢复机制；持续通知改用 subscriptions/listen 的 POST 响应流。参见 [2026-07-28 basic/transports/streamable-http.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx) 和 [2026-07-28 basic/patterns/subscriptions.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/subscriptions.mdx)。

[Python HTTP demo](http_demo/README.md)使用 SDK v2 的真实 HTTP 入口，不手写请求封包。

## 练习

分别运行 stdio 与 HTTP demo。记录同一个 add 工具在两种传输下的工具名、参数结构和结果；说明传输变化为什么不要求改写工具定义。

## HTTP 报文与 JSON-RPC 不在同一层

~~~http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: add

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add","arguments":{"a":1,"b":2},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}}
~~~

`Mcp-Method` 与 `Mcp-Name` 是 HTTP 头；`method`、`name` 和 `_meta` 是 JSON-RPC 体。应用代码使用 SDK，不应只添加一个版本头就宣称实现了 2026。Server 还需满足新版发现、结果与错误结构。

## 选择传输

本机进程由 Host 启动时，stdio 的部署最简单，凭操作系统进程边界组织生命周期。远程共享服务用 HTTP 更自然，同时要考虑认证、Origin 检查和请求重试。两种传输都可以在一个 SDK Server 实现上承载同样的工具语义；[对照表](transport_comparison.md)可作为选型速查。

### 验收

看 [HTTP demo](http_demo/server.py) 的代码，找不到手写 `Mcp-Session-Id`、`initialize` 或无限分块响应。Client 实际打印 2026-07-28 与 add=3，才是示例通过的证据。
