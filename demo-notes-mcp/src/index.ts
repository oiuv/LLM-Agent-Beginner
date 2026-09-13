#!/usr/bin/env node
/**
 * Demo Notes MCP Server（2026-07-28 版本）
 *
 * A demonstration MCP server for note management.
 * This server provides tools to create, read, update, delete, and search notes.
 *
 * Run with: npm start
 * Development: npm run dev
 */

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTools } from "./tools.js";

// Create MCP server instance
const server = new McpServer({
  name: "demo-notes-mcp",
  version: "1.0.0"
});

// Register all tools
registerTools(server);

// 2026 stdio 入口；调试输出只写 stderr。
console.error("MCP 2026-07-28 stdio Server 已启动");
void serveStdio(() => server, { legacy: "reject" });
