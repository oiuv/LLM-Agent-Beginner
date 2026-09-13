# 附录｜2025 握手版与迁移到 2026-07-28

本页用于读旧实现和规划迁移。主线教程从 [协议总览](01-protocol-overview.md) 开始，按已发布的 2026-07-28 规范学习。2025 对照以 [2025-11-25 规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2025-11-25/index.mdx) 为准；新版以 [2026-07-28 变更记录](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/changelog.mdx) 和 [schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts) 为准。draft 不视为已发布版本。

## 旧版一次连接

2025 Client 发送 initialize，Server 返回协议修订、能力与身份，Client 再发 notifications/initialized。部分旧版 Streamable HTTP Server 使用 Mcp-Session-Id；它不是所有旧服务的必选机制。旧版还可能以 GET/SSE 传送推送，或用 resources/subscribe 订阅资源。

## 迁移对照

| 2025 握手版 | 2026-07-28 |
|---|---|
| initialize、notifications/initialized | 每请求 params._meta；Server 必须支持 server/discover，Client 可选探测 |
| 连接内协商版本与能力 | 每请求声明修订与 Client 能力 |
| 可选协议 Session ID | 无协议会话；业务状态用显式句柄 |
| 旧 HTTP GET 推送、resources/subscribe | subscriptions/listen 的 POST 订阅流 |
| Server 主动请求 Client 补充信息 | resultType=input_required 与 inputResponses 的 MRTR |
| 旧结果可省略 resultType | 正常结果标明 complete/input_required |
| ping、logging/setLevel | 2026 移除 |
| 内置 Tasks 试验 | Tasks 为可选扩展 |

Roots、Sampling、Logging、HTTP+SSE 在 2026 处于弃用期；不作为新教程的默认路线，见 [弃用说明](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/deprecated.mdx)。升级不能只替换版本日期；必须改变消息封装、结果、传输与生命周期。SDK v2 可能同时兼容两代协议，测试时应打印最终修订，而非凭包版本判断。

## 迁移练习

选一个旧 Client，逐项检查：是否仍调用 initialize；是否发送 Mcp-Session-Id；是否期待无 resultType 的响应；是否把 GET 推送当成通知通道。完成改造后用 [stdio demo](stdio_demo/README.md) 或 [HTTP demo](http_demo/README.md)核对实际协议版本。

## 读一遍 2025 握手

旧版 Client 发出的第一条典型请求是 initialize。下面只展示理解迁移所需的关键字段，精确结构仍以 [2025-11-25 基础协议](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2025-11-25/basic/index.mdx) 为准：

~~~json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {},
    "clientInfo": {"name": "legacy-client", "version": "1.0.0"}
  }
}
~~~

Server 的 initialize 结果给出选定修订、Server 能力与身份。Client 随后发无 id 的 notifications/initialized。只有完成这一阶段，旧 Client 才进入常规 tools/list、tools/call 等方法。2026 不再有这一步；把上面协议版本字符串改为 2026-07-28 并不能变成新协议。

## 旧版 HTTP 会话与推送

2025 Streamable HTTP 的 Server **可以**在初始化响应中分配 Mcp-Session-Id，之后要求 Client 携带。这个标识是旧协议连接上下文的一部分，并非所有旧服务的必需项。旧版还可使用 GET 建立 Server 到 Client 的推送通道；资源订阅使用 resources/subscribe / resources/unsubscribe。2026 删除协议会话和旧 GET 推送，持续通知由 subscriptions/listen 的 POST 响应流承担。详见 [旧版 HTTP](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2025-11-25/basic/transports.mdx) 与 [新版 HTTP](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)。

## 一段旧代码怎样迁移

1. **Client**：去掉主动 initialize/initialized 的主线路径。改为新版版本策略；若要兼容旧 Server，可用 SDK 的 auto/legacy 模式，但必须记录最终版本。
2. **请求**：每次 Client 请求带版本与能力 _meta。HTTP 还需遵守新版头字段。不要依赖先前连接保存版本。
3. **Server**：实现 server/discover，接受没有握手前置条件的请求；普通结果包含 resultType。可缓存结果包含 ttlMs/cacheScope。
4. **交互**：把旧 Server 主动询问 Client 的路径改为 input_required 与重发时的 inputResponses/requestState。
5. **通知**：把旧订阅/GET 通道改为 subscriptions/listen；断线后重新订阅。
6. **业务状态**：把依赖 Mcp-Session-Id 的应用数据改为显式业务句柄，并在每次调用时验证用户。

迁移后分别运行 [stdio](stdio_demo/README.md) 与 [HTTP](http_demo/README.md) 示例作为参照。两者都能打印实际修订及 add=3，但其内部传输不同。若目标服务需要保留 2025 兼容，应另写一组协商版本测试，不能让 2026 主线测试静默回退。

## 旧测试器源码

[2025 兼容测试器](appendix-2025/README.md)保留了旧 SDK v1 的调用痕迹，仅供对照源代码；它不是本教程 2026 主线的可运行示例。读源码时找出旧版 initialize、Mcp-Session-Id 和 SSE 路径，再对照新版 SDK v2 的 [TypeScript 协议版本指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md)与 [Python 协议版本指南](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/protocol-versions.md)。

### 验收

完成一个两列表：左列写旧代码实际用了哪些握手、会话、推送方法；右列写 2026 对应的封装或方法。最后用运行输出证明新版 Client **实际**协商到 2026-07-28。
