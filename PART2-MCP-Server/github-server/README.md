# 仓库数据 Server：MCP 2026-07-28

此例用固定模拟数据提供 search_repos、get_repo_info 与 list_commits，练习多个工具的输入结构和业务错误。并未访问 GitHub API。

~~~powershell
npm install
npm run build
npm start
~~~

TypeScript SDK v2 的 `serveStdio` 托管 2026 stdio 协议；客户端需确认实际协商修订。规范依据：[工具](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/cc2a84f5ca5404b2949683f7d7876f623344294f/docs/specification/2026-07-28/server/tools.mdx)；SDK 依据：[serveStdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/b65426158ed9f29aea8ef3dc09ca22d7d9d6f970/docs/serving/stdio.md)。
