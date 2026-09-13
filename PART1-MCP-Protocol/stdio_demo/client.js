#!/usr/bin/env node
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("./server.js", import.meta.url));
const client = new Client(
  { name: "lesson-stdio-client", version: "1.0.0" },
  { versionNegotiation: { mode: { pin: "2026-07-28" } } }
);
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath] });

try {
  await client.connect(transport);
  assert.equal(client.getProtocolEra(), "modern");
  const catalog = await client.listTools();
  assert(catalog.tools.some((tool) => tool.name === "add"));
  const result = await client.callTool({ name: "add", arguments: { a: 1, b: 2 } });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent, { result: 3 });
  console.log("protocol=2026-07-28");
  console.log("tools=" + catalog.tools.map((tool) => tool.name).join(","));
  console.log("result=" + String(result.structuredContent?.result));
} finally {
  await client.close();
}
