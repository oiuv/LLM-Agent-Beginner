# 完整演示：天气 + 仓库助手（MCP 2026-07-28）

本例把两个 stdio Server 接入一个 CLI。天气与仓库数据均为教学用固定样本；Agent 部分用简单关键字解析模拟意图，不调用真实模型或 GitHub API。重点是同一 Host 管理两个 MCP Client、确认协议版本、列工具与调用工具。

先分别在 [天气 Server](../PART2-MCP-Server/weather-server/README.md) 和 [仓库 Server](../PART2-MCP-Server/github-server/README.md) 目录执行 `npm install` 与 `npm run build`。再在本目录执行：

~~~powershell
npm install
npm run build
npm run start -- weather 北京
npm run start -- github search react
npm run start -- agent "帮我查一下北京的天气，然后搜索 React 仓库"
~~~

[Client 管理器](src/mcp/client.ts)为每个 Server 建立独立 Client，显式钉住 2026-07-28，并在连接后确认现代协议时代；[CLI](src/cli.ts)选择工具，[演示 Agent](src/agent/index.ts)组合结果。协议依据：[2026 架构](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/architecture/index.mdx)；SDK 依据：[TS 版本策略](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md)。

验收：三种命令都能返回样本数据；将一个 Server 改成仅接受旧协议后，Client 应失败而非静默回退。深入学习见 [章节说明](01-project-overview.md)。
