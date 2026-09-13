#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

function buildServer() {
  const server = new McpServer({ name: "lesson-stdio-server", version: "1.0.0" });
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
  return server;
}

console.error("MCP 2026-07-28 stdio Server 已启动");
void serveStdio(buildServer, { legacy: "reject" });
