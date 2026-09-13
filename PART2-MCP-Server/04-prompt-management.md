# 04｜提示模板

Prompt 是 Server 提供的可复用消息模板。它不同于工具调用：Client 用 prompts/list 发现模板，再用 prompts/get 传入 arguments，取得供 Host 使用的消息。Host 仍决定是否把这些消息放进模型上下文。

## 设计一个模板

“总结仓库”模板可接收 repo 与 focus 参数，返回清楚的消息序列。参数结构应限定名称、必填性与说明；模板内容不能绕过 Host 的系统指令与权限边界。2026 的 prompts/list 结果有 ttlMs/cacheScope；获取模板的结果是带 resultType 的正常响应。依据 [规范：server/prompts.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/prompts.mdx)、[规范：server/utilities/caching.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/utilities/caching.mdx) 和 [2026 schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。

Prompt 可以组合资源 URI，但不应假定获取模板就自动读取资源；Client/Host 负责后续编排。对动态模板，Server 应在 prompts/get 时验证参数和当前用户可见性。模板中的外部文本应视为不可信数据，不能升级为更高优先级指令。

## SDK 参考与练习

[TS Prompts](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/servers/prompts.md) 与 [Python Prompts](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/servers/prompts.md)给出注册方式。练习：写出 `summarize_repo(repo, focus)` 的参数说明、一个返回消息，以及 Host 在送入模型前应做的权限检查。

## 发现与获取的分工

`prompts/list` 告诉 Client 有哪些模板及其参数，适合目录展示与模型工具选择；`prompts/get` 用具体参数生成消息。Client 可以缓存目录，但需按 ttlMs/cacheScope 管理。模板结果也有 resultType；如果缺少必需参数，Server 应提供可解释的错误，而不是悄悄生成错误模板。

一个模板消息可以引用 Resource，但不会自动改变 Host 的指令优先级。Host 应把 Server 返回的文本当作外部内容处理，检查用户是否允许读取被引用的数据，再决定放入模型上下文的位置。

### 示例设计

~~~text
名称: summarize_repo
参数: repo（必填，owner/name）, focus（可选）
目的: 生成针对仓库结构或近期变更的摘要请求
返回: 一组可供 Host 使用的消息
~~~

如果 repo 不存在，模板能否返回通用提示属于应用设计；若 repo 属于私有用户空间，Server 与 Host 需各自做权限检查。模板不应在内容里声称自己拥有系统指令权限。

### 验收

把示例模板分成 prompts/list 中可见的元数据与 prompts/get 返回的消息内容。再解释“目录可见”为什么不等于“私有仓库可读”。
