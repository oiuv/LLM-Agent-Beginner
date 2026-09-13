import asyncio

from mcp import Client


async def main() -> None:
    async with Client("http://localhost:8000/mcp", mode="auto") as client:
        print("protocol=" + client.protocol_version)
        if client.protocol_version != "2026-07-28":
            raise RuntimeError("Server did not negotiate MCP 2026-07-28")
        tools = await client.list_tools()
        print("tools=" + ",".join(tool.name for tool in tools.tools))
        result = await client.call_tool("add", {"a": 1, "b": 2})
        if result.is_error or result.structured_content != {"result": 3}:
            raise RuntimeError("Unexpected tool result: " + repr(result))
        print("result=" + str(result.structured_content["result"]))


if __name__ == "__main__":
    asyncio.run(main())
