# TypeScript Client 示例：发现并调用工具

此目录的 `src/index.ts` 使用 SDK v2 的 Client 与 Streamable HTTP transport。Server 由 `createMcpHandler` 在进程内处理真实的 2026 HTTP 消息，无需占端口；Client 显式 pin 2026-07-28，列出 add，再调用并检查结构化结果。需 Node.js 20+。

~~~powershell
npm install
npm run demo
~~~

预期输出：`protocol=2026-07-28`、`tools=add`、`result=3`。若需要连接 2025 Server，请单独采用 auto 兼容策略并记录最终修订；见 [2025 附录](../../PART1-MCP-Protocol/10-mcp-2026-07-28-upgrade-guide.md)。依据：[SDK 版本策略](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md)、[测试指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/testing.md)。
