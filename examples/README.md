# 示例与实验

从项目根目录运行学习 Agent；MCP 子项目单独安装依赖，其命令见各自 README。TypeScript MCP 实验使用 Node.js 20+；Python 实验需要 Python 3.10+ 与 uv。

| 示例 | 对应阶段 | 验证内容 |
|---|---|---|
| [learning-agent-runtime](learning-agent-runtime/README.md) | 2～4、6～9、12～13 | 无 API Key 的确定性运行时与架构实验 |
| [mcp-stdio](mcp-stdio/README.md) | 5 | stdio 上的发现与工具调用 |
| [mcp-http](mcp-http/README.md) | 5 | Python Streamable HTTP |
| [mcp-client](mcp-client/README.md) | 5 | TypeScript Client 与进程内 HTTP 服务 |
| [weather-mcp](weather-mcp/README.md) | 5 | 模拟天气工具 Server |
| [github-mcp](github-mcp/README.md) | 5 | 模拟仓库工具 Server |
| [mcp-assistant](mcp-assistant/README.md) | 5 | 关键字路由到两个 MCP Server |
| [notes-mcp](notes-mcp/README.md) | 5、7 | 笔记 CRUD 与存储边界 |
| [forum-mcp](forum-mcp/README.md) | 5 | 论坛只读接口封装 |

天气、仓库与组合助手使用模拟数据。组合助手是规则驱动的工具集成实验。接入真实模型的最小循环位于 learning-agent-runtime，通过 ModelProvider 替换 ScriptedModel。

MCP 示例统一以 2026-07-28 为协议基线。SDK 包版本与协议修订分别检查。
