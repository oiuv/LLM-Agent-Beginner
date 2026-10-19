#!/usr/bin/env node
/**
 * Mudren MCP Server for mud.ren（2026-07-28 版本）
 *
 * A MCP server that provides tools to interact with the mud.ren forum API.
 * Uses stdio transport for local/npx usage.
 *
 * Usage:
 *   npm start
 *   npx mudren-mcp
 */

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTools } from "./tools.js";

// Create MCP server instance
const server = new McpServer({
  name: "mudren-mcp",
  version: "1.0.0"
});

// Register all tools
registerTools(server);

// 2026 stdio 入口；调试输出只写 stderr。
console.error("MCP 2026-07-28 stdio Server 已启动");
void serveStdio(() => server, { legacy: "reject" });
