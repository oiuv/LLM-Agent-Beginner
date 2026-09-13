# stdio 示例：MCP 2026-07-28

本目录的 Server 使用 TypeScript SDK v2 的 `serveStdio`，Client 显式钉住 2026-07-28，列出并调用 add 工具。需 Node.js 20+。

~~~powershell
npm install
npm test
~~~

预期输出包含 `protocol=2026-07-28`、`tools=add`、`result=3`。Server 日志写 stderr，stdout 专用于 JSON-RPC。连接若回退旧版，Client 会失败而不是误报新版。接口依据：[TS stdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/serving/stdio.md)、[版本策略](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md)、[2026 规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/stdio.mdx)。
