# 附录：2025 兼容测试器源码

本目录保存旧版交互式测试器及示例配置，供对照 2025 握手、会话与 SSE 行为。它依赖 `@modelcontextprotocol/sdk` v1 的旧导入方式，**不作为 2026-07-28 可运行示例**。当前主线请运行 [stdio demo](../stdio_demo/README.md)、[Python HTTP demo](../http_demo/README.md) 和 [TypeScript Client demo](../../PART3-MCP-Client/client-example/README.md)。

先阅读 [2025 迁移附录](../10-mcp-2026-07-28-upgrade-guide.md)，再比较此源码里的 initialize、Mcp-Session-Id 与新版每请求 _meta。不要把旧测试器的成功连接当成 2026 协议验证。
