# 02｜定义可调用工具

工具是 Server 暴露的动作。一个好工具有稳定名称、明确描述、可校验 inputSchema 和清晰结果。名称用于程序定位，描述用于模型选择，Schema 用于限制输入；授权必须由 Host/Server 的策略实施。

## 定义与调用

以 add(a,b) 为例，输入结构要求两个整数。Client 从 tools/list 取得定义，再发送 tools/call 的 name 与 arguments。SDK 在 2026 请求里填写每请求 _meta；Server 验证参数后调用实现。正常结果有 resultType=complete，可同时给 content（模型可读）和 structuredContent（程序可读）。业务失败使用 isError；协议错误使用 JSON-RPC error。结果字段见 [规范：server/tools.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/tools.mdx) 和 [2026 schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/schema/2026-07-28/schema.ts)。

~~~json
{
  "name": "add",
  "description": "计算两个整数之和",
  "inputSchema": {
    "type": "object",
    "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
    "required": ["a", "b"]
  }
}
~~~

TypeScript SDK v2 的 `server.registerTool` 配合 Zod 4，示例见 [stdio server](../PART1-MCP-Protocol/stdio_demo/server.js)；Python SDK v2 的 `@mcp.tool()` 从类型标注生成输入结构，示例见 [HTTP server](../PART1-MCP-Protocol/http_demo/server.py)。官方示例见 [TS Tools](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/servers/tools.md) 与 [Python Tools](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/servers/tools.md)。

## 设计检查

避免让工具自由执行不受限制的表达式、命令或路径；用窄的参数结构表达具体动作。有副作用的工具要明确用户确认和重复调用语义。description 不能代替权限检查。输出结构若供程序读取，应定义并验证，不只让模型解析自然语言。

## 练习

给 add 加范围限制，再分别测试“字符串参数”和“整数超界”。两种输入都可以在已找到工具后作为工具校验错误返回 isError；再用不存在的工具名触发协议 error，比较 Client 看到的结果。

## 最小 TypeScript 实现

下面的形状与本教程的 [stdio Server](../PART1-MCP-Protocol/stdio_demo/server.js)一致。SDK v2 从 Zod 结构生成 inputSchema；应用只返回工具内容，SDK 填充新版 resultType 等封装字段。

~~~ts
server.registerTool(
  "add",
  {
    description: "计算两个整数之和",
    inputSchema: z.object({ a: z.number().int(), b: z.number().int() }),
    outputSchema: z.object({ result: z.number() })
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
    structuredContent: { result: a + b }
  })
);
~~~

对于程序要直接读取的数值，用 structuredContent 避免解析自然语言。若定义 outputSchema，返回值就应符合它；不要在文档承诺 result 是数字，却实际返回拼接字符串。

## 结果与工具行为的取舍

只读查询可以在权限允许时自动调用；写操作需要明确副作用、重复执行策略与用户确认。参数越宽泛，Server 越难可靠校验。例如“执行一段代码”远比“读取指定笔记 ID”更难约束。Agent 只会看到经 Host 筛选后的工具，不应直接接收整个 Server 目录。

### 验收

阅读 [Python add](../PART1-MCP-Protocol/http_demo/server.py) 与 TS add，确认二者暴露同名工具且整数输入。分别解释 TypeScript 的 Zod 与 Python 的类型标注如何形成输入约束；再用 Client 输出核对 `structuredContent.result=3`。
