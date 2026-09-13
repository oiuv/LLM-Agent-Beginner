# Streamable HTTP 示例：MCP 2026-07-28

本目录使用 Python SDK v2 的 `MCPServer` 与高层 `Client`。Server 暴露 add 工具；Client 使用 auto 探测，但要求实际协商到 2026-07-28。需 Python 3.10+ 与 uv。

~~~powershell
uv sync
~~~

终端一：

~~~powershell
uv run mcp run server.py --transport streamable-http
~~~

终端二：

~~~powershell
uv run python client.py
~~~

预期输出：`protocol=2026-07-28`、`tools=add`、`result=3`。SDK 实现 HTTP 头、每请求 _meta、server/discover 与结果封装；示例不手写旧版会话或 initialize。接口依据：[Python README](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/README.md)、[协议版本](https://github.com/modelcontextprotocol/python-sdk/blob/9972c21aa42054fb1450c5fc614761ed11847ec6/docs/protocol-versions.md)、[HTTP 规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)。
