import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "add-lesson", version: "1.0.0" });

  server.registerTool(
    "add",
    {
      description: "Add two integers",
      inputSchema: z.object({ a: z.number().int(), b: z.number().int() }),
      outputSchema: z.object({ result: z.number() })
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
      structuredContent: { result: a + b }
    })
  );

  return server;
});

const transport = new StreamableHTTPClientTransport(
  new URL("http://lesson.local/mcp"),
  { fetch: (url, init) => handler.fetch(new Request(url, init)) }
);
const client = new Client(
  { name: "lesson-client", version: "1.0.0" },
  { versionNegotiation: { mode: { pin: "2026-07-28" } } }
);

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
  await handler.close();
}
