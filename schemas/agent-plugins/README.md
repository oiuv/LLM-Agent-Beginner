# Agent Plugins 官方 Schema

本目录保存 Agent Plugins 1.0.0 的官方机器可读 Schema，供仓库作者检查离线使用。下载日期：2026-10-19，JSON 文件内容未修改。

| 文件 | 官方来源 | SHA-256 |
|---|---|---|
| [plugin.schema.json](1.0.0/plugin.schema.json) | [Manifest Schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json) | 0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883 |
| [mcp.schema.json](1.0.0/mcp.schema.json) | [MCP Schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json) | 6539175bfcdf43085855183e86da40ea94b166547a72b47ae9a0a390516d3acb |

Schema 之外的运行语义以 [完整规范](https://agent-plugins.org/specification) 为准。工具不在校验时下载 $schema 地址；升级规范版本时应同时更新两个 Schema、校验脚本和示例。

来源：Agent Plugins documentation contributors。官方文档注明 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；保留来源与版本，避免把这些文件当作本项目自定义格式。

校验器使用 [Ajv draft-2020-12](https://ajv.js.org/json-schema.html#draft-2020-12-breaking) 和 [YAML](https://eemeli.org/yaml/)；它是作者检查器，不模拟客户端的所有容错行为。
