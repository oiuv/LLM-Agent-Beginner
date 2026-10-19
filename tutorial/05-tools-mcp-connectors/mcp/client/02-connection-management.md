# 02｜连接、版本与恢复

2026 Client 管理的是传输和请求，不是协议 Session ID。stdio 连接对应子进程的输入输出；Streamable HTTP 对每条 Client 消息独立 POST。无论连接是否复用，每条请求仍携带自己的协议修订与能力。详见 [规范：basic/transports/stdio.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/stdio.mdx)、[规范：basic/transports/streamable-http.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)。

## 建立连接时确认版本

Client 可以先请求 server/discover 探测版本，也可以按配置直接发送 2026-07-28 请求。连接成功后仍需确认实际修订。TS 示例钉住 2026，Python 示例使用 auto 后检查 `protocol_version`。依据 [规范：server/discover.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/discover.mdx)、[TS 版本文档](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/protocol-versions.md)、[Python 版本文档](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/protocol-versions.md)。

## 断线与重试

HTTP 响应中断时，工具可能已经执行；对有副作用的调用不要盲目重发。用业务幂等键、状态查询或人工确认避免重复动作。若 subscriptions/listen 流断开，重新订阅并刷新可能过期的目录。健康检查是传输或应用层策略，不应伪造协议 ping。见 [规范：basic/patterns/subscriptions.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/subscriptions.mdx) 和 [规范：changelog.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/changelog.mdx)。

## 练习

假设提交订单的 HTTP 响应丢失。写出 Client 在再次发起前检查的业务状态，以及为什么断线不能证明“未下单”。

## 固定协议基线

本课程统一验证 2026-07-28。TS 示例使用 pin，Python 示例在自动发现后断言实际修订；不匹配就失败。协议基线检查应进入实验输出，SDK 包名不能代替它。

### 连接恢复的状态机

~~~text
未连接 → 连接/发现 → 已确认协议 → 目录可用 → 调用中
   ↑          │              │             │          │
   └──────────┴──────────────┴─────────────┴──断线─────┘
~~~

重连后应再次确认协议，重新获取可能过期的目录；持续订阅需要重新发 subscriptions/listen。Host 的用户 Thread、任务进度和审批记录位于应用层，不由 MCP 连接恢复。stdio 子进程意外退出时，应由 Host 决定是否重启；HTTP 断开时，应区分只读查询和可能已执行的写操作。

## 超时与取消

超时只表示 Client 未在预算内得到可用结果。取消可通过协议模式通知请求不再需要继续，但它不是撤销已提交业务动作的保证。对写操作应提供业务状态查询或幂等键。规范依据：[取消](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/patterns/cancellation.mdx)、[HTTP](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)。

### 验收

在表格中写出只读查询、创建订单、持续订阅三类操作断线后的第一步，三者不应使用同一条盲目重试规则。
