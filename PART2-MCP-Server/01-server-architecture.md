# 01｜MCP Server 架构（2026-07-28）

Server 把应用能力包装为工具、资源和提示，通过 stdio 或 Streamable HTTP 提供给 Client。先定义能力边界，再选择 SDK 与传输。Host 的权限策略和 Server 的鉴权都要发挥作用，不能只靠工具描述文字保护真实操作。

## 从请求到结果

2026 Server 处理每条自包含请求：读取 params._meta 的修订与 Client 能力，路由方法，校验输入，执行应用逻辑，返回带 resultType 的结果。Server 必须实现 server/discover，但不能要求 Client 先调用；也不能要求 initialize。可缓存的列表和资源读取结果需要 ttlMs/cacheScope。依据 [规范：basic/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/index.mdx)、[规范：server/discover.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/discover.mdx)、[2026 schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。

工具适合执行动作，资源适合按 URI 读取上下文，提示适合复用消息模板。先做一个只读工具，再扩展资源和提示，便于观察边界。详见 [工具](02-tool-definition.md)、[资源](03-resource-management.md)、[提示](04-prompt-management.md)。

## SDK v2 入口

TypeScript Server 使用 `McpServer` 注册能力。stdio 入口用 `serveStdio(() => buildServer())`；HTTP 入口用 `createMcpHandler(() => buildServer())`。factory 为连接/请求构造实例，SDK 负责协议封装。参见 [TS stdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/serving/stdio.md)、[TS HTTP](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/serving/http.md)。

Python SDK v2 的高层 `MCPServer` 可用类型标注注册工具，并由 `mcp run` 提供 HTTP/stdio 入口。参见 [Python README](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/README.md) 和 [工具指南](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/servers/tools.md)。

## 练习

运行 [天气 Server](weather-server/README.md) 或 [Python HTTP demo](../PART1-MCP-Protocol/http_demo/README.md)，列出工具。再说明路由、参数校验、业务执行和结果封装各由哪层负责。

## 把职责拆成四层

| 层 | 本例位置 | 它负责什么 |
|---|---|---|
| 应用数据 | 天气与仓库模拟数据 | 提供业务事实 |
| 能力定义 | registerTool 的名称、描述、Schema | 告诉 Client 能调用什么 |
| 协议实例 | McpServer | 处理 MCP 方法与结果 |
| 传输入口 | serveStdio / createMcpHandler | 接收消息并发回响应 |

开发顺序应从应用数据与权限边界开始，再定义工具 Schema，最后选择传输。把所有代码写进一个网络回调会让错误分类、授权与协议状态混在一起。

### 观察一次 tools/call

Client 发出工具名与 arguments；Server 首先确认协议修订和请求形状，再找到工具，校验具体输入，执行逻辑并返回结果。若业务数据没有该城市，结果应带 isError，给模型可修正的信息；若工具名根本不存在，属于协议错误。SDK 可以提供默认封装，但业务函数仍需明确自己的错误语义。

### 验收

在 [天气 Server](weather-server/src/index.ts) 中找到四层对应的代码。把一个城市名改为不存在，记录 Client 看到的结果，并说明这与发起不存在的工具名有何不同。
