# 04｜能力、发现与授权

能力回答“双方理解哪些协议操作”，授权回答“此用户能否使用该操作”。两者不能混为一谈。Server 对外声明工具、资源、提示等能力；Host 可进一步限制模型所见目录与可调用范围。

## 2026 能力声明

Client 的协议修订与能力放在**每条**请求的 params._meta 中。Server 通过 server/discover 广告支持的版本与能力，但 Client 不必先调用它才能使用其他方法。Server 不能依赖已经执行 initialize 或某个会话中的旧能力表。依据 [2026-07-28 server/discover.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/discover.mdx)、[2026-07-28 basic/index.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/index.mdx) 和 [schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。

工具的 inputSchema 是参数结构；description 帮助模型理解用途；annotations 是提示信息，不是权限边界。Server 应重新验证参数及用户凭证。资源的 URI、mimeType 帮助 Client 选择上下文；提示的 arguments 帮助填模板。分别参见 [2026-07-28 server/tools.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/tools.mdx)、[2026-07-28 server/resources.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/resources.mdx)、[2026-07-28 server/prompts.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/prompts.mdx)。

## 兼容而不混淆

TypeScript SDK v2 的直接 Client 默认可沿旧协议运行；必须显式选择 auto 或 pin 2026 并验证实际结果。Python SDK v2 高层 Client 默认 auto，也必须检查 protocol_version。旧版 Roots、Sampling、Logging 处于弃用期，Tasks 已从核心协议移为扩展。详见 [2026-07-28 changelog.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/changelog.mdx)、[2026-07-28 deprecated.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/deprecated.mdx)。

## 练习

为“查天气”工具写出名称、描述、输入 Schema、授权检查各由谁提供。然后解释为什么 Server 宣称 tools 能力不代表所有用户都能调用它。

## 读一份发现结果

`server/discover` 的结果含 supportedVersions、capabilities，可能含 instructions，同时遵循可缓存结果的 ttlMs/cacheScope。Client 可以据 supportedVersions 选择后续请求的修订；不能把 instructions 当成高优先级系统策略。完整结构见 [DiscoverResult](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。

Server 声明 tools 后，Client 仍需调用 tools/list 获得具体工具。能力表回答“Server 支持这类方法吗”，目录回答“有哪些定义”，授权回答“当前用户能不能用”。三个问题需要分别检查。

## 每请求能力的实际含义

Client 不能假设 Server 会记住上一个请求的能力声明。即使两个请求从同一个 HTTP 客户端发出，第二个请求也必须自带修订和 Client 能力。SDK 会负责发包，但应用测试应能观察实际协商结果。对于同一 Server 的旧版兼容连接，不得将旧响应中的“没有 resultType”解释为 Server 违反 2026；它可能明确处于 2025 修订。

### 验收

用一句话分别解释 supportedVersions、clientCapabilities 和用户授权。三句话里不能互换主语。
