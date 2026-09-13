from mcp.server import MCPServer

mcp = MCPServer("add-lesson")


@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two integers."""
    return a + b
