"""Smoke-test the learning plugin's configured service; this is not a plugin loader."""
import asyncio
import json
from pathlib import Path

from mcp import Client


async def main() -> None:
    root = Path(__file__).resolve().parents[1]
    plugin = root / "examples" / "learning-coach-plugin"
    config = json.loads((plugin / "mcp.json").read_text(encoding="utf-8"))
    server = config["mcpServers"]["math-tools"]
    if server["type"] != "streamable-http" or server["url"] != "http://localhost:8000/mcp":
        raise RuntimeError("This smoke test only targets the local teaching HTTP service")
    async with Client(server["url"], mode="auto") as client:
        tools = await client.list_tools()
        if "add" not in {tool.name for tool in tools.tools}:
            raise RuntimeError("Configured server does not expose add")
        result = await client.call_tool("add", {"a": 19, "b": 23})
        if result.is_error or result.structured_content != {"result": 42}:
            raise RuntimeError("Unexpected addition result: " + repr(result))
        print("plugin=learning-coach server=math-tools protocol=" + client.protocol_version)
        print("result=42")


if __name__ == "__main__":
    asyncio.run(main())
