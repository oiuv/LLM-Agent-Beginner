# 传输选型：stdio 与 Streamable HTTP（2026-07-28）

| 维度 | stdio | Streamable HTTP |
|---|---|---|
| 典型场景 | Host 启动本地 Server 子进程 | 远程或共享服务端点 |
| Client 发消息 | stdin 的 UTF-8 JSON-RPC 行 | 每条消息单独 POST |
| Server 响应 | stdout 的 UTF-8 JSON-RPC 行 | 单个 JSON 或请求相关 SSE |
| 调试输出 | stderr | Server 日志 |
| 持续通知 | 传输上的通知 | subscriptions/listen 的 POST 响应流 |

两者承载同样的 MCP 方法。2026 版都不需要 initialize，也不提供 Mcp-Session-Id 协议会话。HTTP+SSE 旧传输已弃用。规范：[stdio](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/stdio.mdx)、[Streamable HTTP](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)、[变更记录](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/changelog.mdx)。

先运行 [stdio demo](stdio_demo/README.md)，再运行 [HTTP demo](http_demo/README.md)。确认两者都报告 2026-07-28，并比较工具调用结果。
