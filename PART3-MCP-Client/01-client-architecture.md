# 01｜MCP Client 架构（2026-07-28）

Host 通常管理多个 MCP Client；每个 Client 连接一个 Server，并把发现的工具、资源、提示交给 Host 的能力目录。Host 决定模型能看见什么、调用是否需要批准，以及结果怎样进入对话。Client 负责协议版本、传输、方法调用和响应解析。

## 一条调用链

1. 配置 Server 的 stdio 命令或 Streamable HTTP URL，并选择版本策略。2026 Server 必须实现 server/discover；Client 可探测也可直接请求。
2. 读取目录：tools/list、resources/list、prompts/list。根据 ttlMs/cacheScope 缓存并按用户隔离 private 数据。
3. Host 筛选工具，模型选择工具后，Client 发送 tools/call。SDK 填写每请求 _meta，Host 填业务参数。
4. 根据 resultType、isError、JSON-RPC error 分流处理；input_required 由 Host 收集输入并继续。

规范见 [规范：architecture/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/architecture/index.mdx)、[规范：basic/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/index.mdx) 和 [2026 schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。具体发现见 [工具发现](03-tool-discovery.md)。

## SDK v2 版本选择

TS SDK 的直接 Client 默认可能连接旧时代；新版需 `versionNegotiation: { mode: { pin: "2026-07-28" } }`，或 auto 后检查 `getProtocolEra()`。Python 高层 Client 默认 auto，连接后检查 `protocol_version`。SDK 包版本 2.x 不是协议修订证明。参见 [TS 版本文档](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md) 和 [Python 版本文档](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/protocol-versions.md)。

[TypeScript Client 示例](client-example/README.md)与 [Python Client 示例](../PART1-MCP-Protocol/http_demo/README.md)打印实际版本并调用工具。

## 练习

画出 Host、两个 Client 和两个 Server。两个 Server 都有同名工具时，设计 Host 使用的唯一标识和权限筛选规则。

## 从 SDK 调用走一遍

[示例代码](client-example/src/index.ts)先创建 `StreamableHTTPClientTransport`，再创建 `Client` 并钉住 2026-07-28。连接后读取 `getProtocolEra()`，随后列工具、调用 add，最后关闭 Client。若连接失败，finally 仍释放资源。这条顺序体现“确认协议版本 → 发现 → 调用 → 解释结果”的 Client 职责。

~~~ts
const client = new Client(
  { name: "lesson-client", version: "1.0.0" },
  { versionNegotiation: { mode: { pin: "2026-07-28" } } }
);
await client.connect(transport);
if (client.getProtocolEra() !== "modern") throw new Error("协议修订不符");
const catalog = await client.listTools();
const result = await client.callTool({ name: "add", arguments: { a: 1, b: 2 } });
~~~

实际实现还要检查目录里确实有 add、result.isError 是否为真，以及 structuredContent 是否符合预期。示例代码都执行了这些检查。Client 不应为了“成功连接”静默改变用户要求的协议基线。

## Host 为什么还需要目录

Client 的 tools/list 只是 Server 原始目录。Host 还需组合多个 Server 的目录，保留来源、权限、工具版本与用户可见性。一个工具被模型看到前，Host 可以选择不展示，或要求批准。Server 即使描述为“只读”，Host 也应按其实际副作用制定策略。

### 验收

运行 TS 示例，逐行对应版本确认、目录、调用和结果检查。再说明如果添加第二个 Server，为什么不能把两份工具列表直接按名称合并。
