# 天气 Server：MCP 2026-07-28

模拟城市天气，提供 get_weather、get_forecast、get_air_quality 和 list_cities。TypeScript SDK v2 通过 `serveStdio` 暴露 stdio 端点；业务数据是固定教学样本，不调用真实天气 API。

~~~powershell
npm install
npm run build
npm start
~~~

Server 启动后等待 Client 从 stdin 发 JSON-RPC；调试日志在 stderr。可用 [Client 章节](../../PART3-MCP-Client/01-client-architecture.md) 的版本策略连接。规范依据：[stdio](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/stdio.mdx)；SDK 依据：[serveStdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/serving/stdio.md)。
