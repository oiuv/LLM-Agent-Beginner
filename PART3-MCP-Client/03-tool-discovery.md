# 03｜发现工具并安全调用

tools/list 给 Client 一个 Server 的工具目录。工具名称、描述和 inputSchema 帮助 Host 将其映射到模型可调用集合；目录不等于用户授权。多个 Server 有同名工具时，Host 应保存来源标识，而不只传裸名称。

## 发现流程

Client 先确认正在使用的协议修订，然后调用 tools/list。2026 的列表结果必须含 ttlMs/cacheScope；Client 可按期限缓存，private 范围需按用户隔离。列表变化可通过 subscriptions/listen 通知，但刷新权限时仍应主动失效相关缓存。规范见 [规范：server/tools.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/tools.mdx)、[规范：server/utilities/caching.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/utilities/caching.mdx)、[规范：basic/patterns/subscriptions.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/subscriptions.mdx)。

调用时先由 Host 审批并按 inputSchema 构造 arguments，再用 tools/call 发给正确 Server。Client 检查 resultType：complete 时再读 structuredContent/content 和 isError；input_required 时交给 Host 完成 MRTR。JSON-RPC error 与传输失败另行处理。详见 [规范：basic/patterns/mrtr.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/mrtr.mdx) 和 [错误处理](../PART1-MCP-Protocol/06-error-handling.md)。

## 可运行示例

[TS Client](client-example/src/index.ts) 和 [Python Client](../PART1-MCP-Protocol/http_demo/client.py)均先打印真实版本，再列工具并调用 add。参考 [TS Client 指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/clients/calling.md) 和 [Python Client 指南](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/client/index.md)。

## 练习

在工具目录中加入另一个 Server 的 add。设计 Host 展示名称、内部唯一键和权限过滤步骤；解释为什么不能只凭工具描述识别目标 Server。

## 将目录转成 Host 可用工具

~~~text
Server 标识 + tools/list 原始工具
  → 保留来源与 inputSchema
  → 结合用户权限、任务与风险筛选
  → 生成模型可见工具
  → 调用时按来源路由回同一个 Server
~~~

Host 可以把 `weather:get_weather` 与 `github:get_repo_info` 作为内部唯一键，同时保留 Server 原始 name 供 tools/call 使用。若两个 Server 都有 `search`，内部键分别是 `notes:search` 与 `repo:search`，避免模型选择与实际调用错位。

### 一次成功调用的检查点

1. 确认 Client 实际运行 2026 修订；
2. 列表的 ttlMs/cacheScope 被正确处理，且当前用户可见；
3. 工具 name 和 arguments 与目录 Schema 对应；
4. Host 已实施必要授权；
5. resultType=complete 后检查 isError，并读取 content/structuredContent；
6. 若是 input_required，进入 MRTR，不当作成功最终结果。

### 验收

在 [TypeScript 示例](client-example/src/index.ts) 中找到目录检查、调用和结构化结果断言。再画出一个缺少权限的用户为什么在第 4 步就应停止，而不是等 Server 拒绝后再把错误交给模型。
