# 01｜MCP 协议总览（2026-07-28）

MCP 把 Agent Host 与外部能力之间的接口标准化。Host 管理模型、对话、权限与多个 Client；每个 Client 面向一个 Server。Server 提供工具（动作）、资源（数据）和提示（模板）。协议规定发现、调用和传输，不替 Host 决定何时使用工具或是否需要用户授权。

## 版本与学习路径

本教程以已发布的 **2026-07-28** 修订为主线。JSON-RPC 2.0 是消息封装格式；TypeScript/Python SDK v2 是软件版本，不能据此推断线上协议修订。规范由 [2026-07-28 index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/index.mdx) 和 [schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts) 定义；draft 不是本教程的已发布基线。

阅读顺序：本篇 → [JSON-RPC](02-json-rpc-spec.md) → [消息](03-message-types.md) → [能力](04-capabilities.md) → [传输](05-transport-layer.md) → [错误](06-error-handling.md) → [Server](../PART2-MCP-Server/01-server-architecture.md) → [Client](../PART3-MCP-Client/01-client-architecture.md)。

## 一次调用如何发生

1. Client 选择 Server 的 stdio 或 Streamable HTTP 端点。可先请求 server/discover 得知 Server 支持的修订与能力；它是 Server 必须实现、Client 可选使用的方法。
2. Client 发 tools/list，读取工具名称、描述与输入结构。Host 再按用户权限过滤可用工具。
3. Client 发 tools/call。每条请求的 params._meta 声明协议修订与 Client 能力；不依赖连接先前的 initialize 状态。
4. Server 返回 resultType=complete 的结果。若需要更多输入，可返回 input_required，Host 收集输入后用 inputResponses 继续原调用。
5. Client 区分协议错误、工具业务错误和网络失败，并将可用内容交给 Agent。

2026 版移除了协议级会话与 initialize/initialized。跨调用业务状态需要显式句柄或业务存储，不能以传输连接暗示。详见 [2026-07-28 architecture/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/architecture/index.mdx)、[2026-07-28 server/discover.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/discover.mdx)、[2026-07-28 basic/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/index.mdx)。

## 练习

画出“用户 → Host → Client → Server → Tool → Client → Host”的链路。标出权限判断、工具输入校验和结果解释分别发生在哪里；再运行 [stdio 示例](stdio_demo/README.md)，确认实际修订为 2026-07-28。

## 用一个加法工具读懂三层边界

同一能力可以通过 stdio 或 HTTP 暴露，`add(a,b)` 的业务定义不变。Agent 提出“计算 1+2”；Host 决定允许使用哪个 Server；Client 将工具名和参数封成 MCP 请求；Server 校验并计算；Client 再把结果交回 Host。若 Host 有两个都叫 add 的 Server，Host 必须保存 Server 来源，不能只靠工具名路由。

在 [stdio 服务端](stdio_demo/server.js) 中，`registerTool` 负责注册业务能力；`serveStdio` 负责协议入口。在 [Client](stdio_demo/client.js) 中，`listTools()` 是发现，`callTool()` 是调用。它们都不是模型推理本身。

### 可观察的验收

运行 `npm test` 后，输出依次显示协议修订、目录和结果。将 Client 的版本钉住旧版，再连接这个只接受新版的 Server，应明确失败。这说明“安装了 v2 SDK”“连上了 Server”和“实际运行 2026 协议”是三个不同事实。
