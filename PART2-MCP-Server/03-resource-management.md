# 03｜资源与缓存

资源以 URI 表示可读取的上下文。与工具的动作不同，资源重点是“定位、读取、解释内容”。Server 可以列出资源和资源模板，Client 再按 URI 请求 resources/read。

## 目录、模板与读取

resources/list 返回具体资源，resources/templates/list 描述可参数化 URI，resources/read 返回内容。2026 版这三类结果都需要 ttlMs/cacheScope；cacheScope=private 的内容不得跨用户共享。Client 的缓存过期策略由结果提示与应用权限变化共同决定。规范见 [规范：server/resources.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/resources.mdx) 和 [规范：server/utilities/caching.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/utilities/caching.mdx)。

资源 URI 应稳定、可理解，mimeType 应真实描述内容。Server 必须对 URI 中的标识和调用者权限重新验证，不能因为目录里有该 URI 就允许任意读取。大资源可分页或在业务层提供摘要/检索工具，但不能把无限数据直接塞给模型。

## 变更通知

2026 的持续变更通知由 Client 发起 subscriptions/listen，订阅指定类别。旧版 resources/subscribe 与 HTTP GET 推送不属于主线。断线后 Client 应重新建立订阅并按业务需要刷新目录，参见 [规范：basic/patterns/subscriptions.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/subscriptions.mdx)。

## SDK 参考与练习

[TS 资源指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/servers/resources.md) 和 [Python 资源指南](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/servers/resources.md)提供注册示例。练习：设计 `memo://notes/{id}` 资源模板，给出一个具体 URI、mimeType、private 缓存策略，并说明另一个用户读取同一 URI 时 Server 应检查什么。

## 资源返回的可观察字段

~~~json
{
  "resultType": "complete",
  "ttlMs": 1000,
  "cacheScope": "private",
  "contents": [
    {"uri": "memo://notes/42", "mimeType": "text/plain", "text": "复习计划"}
  ]
}
~~~

这是 resources/read 的结果主体示意；JSON-RPC 外壳另有 jsonrpc、id 和 result。ttlMs=1000 提示在收到结果后约一秒内可视作新鲜；private 意味着只能在同一授权上下文复用，令牌或用户改变时不能跨上下文命中。实际 Schema 见 [ReadResourceResult](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。

## 何时用资源、何时用工具

固定或可列举的文档适合作为 Resource。需要执行查询、分页过滤、写入或有副作用的操作通常更适合作为 Tool。Resource URI 的稳定性有利于缓存与引用，但 URI 本身不是授权令牌。Server 必须在每次读取时检查调用者是否有权访问具体对象。

### 验收

为“课程笔记”设计一个资源 URI 与一个搜索工具：前者读取给定笔记，后者按关键词查找候选笔记。说明搜索结果为何不直接等同于读取权限。
