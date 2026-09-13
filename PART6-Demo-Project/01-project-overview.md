# 完整演示项目：两个 MCP Server 与一个 Agent Host

本章把 [Server 章节](../PART2-MCP-Server/01-server-architecture.md) 和 [Client 章节](../PART3-MCP-Client/01-client-architecture.md)接在一起。前置是已理解 tools/list、tools/call、每请求 _meta 与无协议会话的 2026-07-28 生命周期。本例使用模拟天气和仓库数据，意图识别由关键字实现，因此能离线观察 MCP 的连接与调用，不需要外部 API。

## 结构与调用链

`PART2-MCP-Server/weather-server` 暴露天气工具，`PART2-MCP-Server/github-server` 暴露仓库工具，两者均由 TypeScript SDK v2 的 `serveStdio` 托管。CLI 创建 `MCPClientManager`，分别启动两个 Server 子进程。管理器的每个 Client 钉住 2026-07-28，连接后检查实际协议时代；再按 Server 来源路由 tools/call。Agent 根据查询词选择天气、仓库或组合路径。

~~~text
用户命令 → CLI / DemoAgent → MCPClientManager
                            ├─ weather Client → weather Server → 天气工具
                            └─ github Client  → github Server  → 仓库工具
~~~

[Client 代码](src/mcp/client.ts)持有两个独立连接；[Agent 代码](src/agent/index.ts)只处理演示用意图与结果；[CLI 代码](src/cli.ts)负责用户输入。真实 Agent 需要另外接入模型、用户权限与审计，不能把演示关键字逻辑当成通用规划器。

## 运行与验收

先按 [README](README.md) 编译两个 Server，再安装并运行本目录。运行 `weather 北京` 应看到天气；运行 `github search react` 应看到模拟仓库；运行组合查询应在一次 Agent 回复中看到两个工具结果。Client 若无法确认现代协议时代，应明确失败。

思考：两个 Server 若都注册 `search`，Host 如何保留 Server 来源？网络或子进程退出后，有副作用的调用为何不能盲目重试？这些问题分别对应 [工具发现](../PART3-MCP-Client/03-tool-discovery.md) 与 [错误处理](../PART1-MCP-Protocol/06-error-handling.md)。

规范依据：[2026-07-28 架构](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/architecture/index.mdx)、[schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。SDK 依据：[TypeScript 版本策略](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md)。
