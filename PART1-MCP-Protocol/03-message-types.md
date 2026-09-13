# 03｜请求、结果、通知与多轮输入

理解 MCP 消息，先按“谁发起、是否有响应、结果如何结束”分类，而不是按旧版握手顺序背方法名。

| 类型 | 示例 | 处理方式 |
|---|---|---|
| Client 请求 | server/discover、tools/list、tools/call、resources/read | 带 id；Server 返回 result 或 error |
| Server 结果 | complete、input_required | 2026 的正常结果必须有 resultType |
| 通知 | 列表变化、资源变化、进度 | 无 id；按所属请求流或订阅流接收 |
| JSON-RPC error | 方法、参数、版本错误 | 不是工具业务失败 |

## 发现与目录

Server 必须实现 server/discover；Client 可以先探测，也可以直接调用。tools/list、prompts/list、resources/list、resources/templates/list 和 resources/read 的结果包含 ttlMs/cacheScope，供 Client 安全缓存。目录并不授权调用，Host 仍决定用户可见范围。依据 [2026-07-28 server/discover.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/discover.mdx)、[2026-07-28 server/utilities/caching.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/utilities/caching.mdx)。

## 多轮请求（MRTR）

当工具需要用户确认或补充信息时，Server 返回 resultType=input_required 和 inputRequests。Client/Host 处理请求，再在原方法的 params 中加入 inputResponses，重新发起该调用。Server 不通过旧的反向请求在调用中向 Client 索取信息。Host 应保存足够的业务上下文，避免重复执行副作用。详见 [2026-07-28 basic/patterns/mrtr.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/mrtr.mdx)。

## 持续通知

2026 版通过 Client 发起 subscriptions/listen 来接收所选类别的持续通知。与某个请求直接相关的进度仍留在该请求的响应流。取消和进度的规则分别见 [2026-07-28 basic/patterns/cancellation.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/cancellation.mdx)、[2026-07-28 basic/patterns/progress.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/progress.mdx)；持续订阅见 [2026-07-28 basic/patterns/subscriptions.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/subscriptions.mdx)。

## 练习

对“工具要求用户确认后继续”写出两次 Client 请求与两次 Server 响应的类型；指出哪一次含 inputResponses，以及为什么不需要 Server 主动发起 Client 请求。

## 消息分类的判断顺序

先看 `id`：有 id 且有 method 是请求；有 id 且有 result/error 是响应；没有 id 且有 method 是通知。然后再看 MCP 方法名与 resultType。这个顺序能避免把通知误等成调用结果，也能避免把工具的 isError 当成 JSON-RPC error。

### 一次多轮调用的时间线

~~~text
Client → Server: tools/call(请求 A，含每请求 _meta)
Server → Client: resultType=input_required，含 inputRequests 或 requestState
Host   → 用户/模型: 完成所需输入或等待
Client → Server: 重发 tools/call，含 inputResponses/requestState
Server → Client: resultType=complete
~~~

规范要求 input_required 至少包含 inputRequests 或 requestState。requestState 是 Server 交给 Client 的不透明值，Client 原样带回，不能解析为业务含义。若只有 requestState，Server 可能是在要求稍后继续，而非立刻提问用户。具体约束见 [MRTR 规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/mrtr.mdx)。

### 验收

读一个响应时，先说出它是 JSON-RPC 响应还是通知，再说出 complete / input_required / error。仅凭是否存在 content 判断成功是不够的。
