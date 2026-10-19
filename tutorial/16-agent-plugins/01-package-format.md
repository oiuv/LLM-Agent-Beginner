# 01：标准插件格式

## 先看实际目录

[学习导师插件](../../examples/learning-coach-plugin/README.md) 的核心结构：

~~~text
learning-coach-plugin/
├── plugin.json
├── mcp.json
└── skills/
    ├── diagnose-mistakes/
    │   ├── SKILL.md
    │   └── references/assessment-rubric.md
    └── guided-practice/
        ├── SKILL.md
        └── references/hint-ladder.md
~~~

插件根目录与 Skill 根目录是不同层级。每项 Skill 放在 skills/ 的直接子目录，复用 [Agent Skills 格式](../06-skills/specification.md)，参考资料随 Skill 一起携带。客户端不递归搜索更深的目录来发现额外 Skill。[官方 Skills 说明](https://agent-plugins.org/plugin-authors/skills)

## plugin.json：身份和元数据

~~~json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "learning-coach",
  "version": "1.0.0",
  "description": "基于作答证据的错题诊断与分级练习"
}
~~~

必需字段只有 $schema 与 name。version 是可选的插件版本，建议遵循语义化版本；它与 $schema 指定的规范版本不同。author、homepage、repository、license、keywords 和 extensions 也属于可选字段。

Manifest 顶层不接受任意自定义键。不要把工具权限、模型配置、用户记忆或额外组件路径塞进顶层；宿主专属数据走 extensions。完整字段和名称约束以 [官方 Manifest 文档](https://agent-plugins.org/plugin-authors/manifest) 为准。

## mcp.json：外部能力连接

样例连接本仓库的整数加法教学服务：

~~~json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "math-tools": {
      "type": "streamable-http",
      "url": "http://localhost:8000/mcp"
    }
  }
}
~~~

这里配置服务连接，工具名和参数仍由 MCP 发现。mcp.json 与 plugin.json 的规范版本必须一致；MCP 消息协议修订是另一个版本概念。缺少 mcp.json 可以表示插件不提供 MCP。

本地进程使用 stdio，command 只写一个可执行程序，参数放 args；远程连接通常使用 streamable-http。旧 HTTP+SSE 对应 sse，不能把 Streamable HTTP 内的 SSE 响应误写成它。非回环远程地址需要 HTTPS；凭证由宿主管理，不能写进包内 headers 或 env。[官方 MCP 配置](https://agent-plugins.org/plugin-authors/mcp-servers)

## Hooks 放在哪一层

可移植核心没有统一的 hooks.json 格式。客户端可在 extensions 中使用反向域名命名空间，也可在根目录下使用同名目录存放自己的文件，例如：

~~~text
plugin.json
skills/
com.example.client/
└── hooks/
    └── hooks.json
~~~

这是命名空间布局示意，不是可直接交给 Claude Code 或 Codex 的配置。命名空间所有者定义内容与执行语义；其他客户端可以忽略它。[官方客户端扩展](https://agent-plugins.org/plugin-authors/client-extensions)

[阶段 8](../08-execution-runtime/hooks.md) 的 RuntimeHooks 也需要适配器才能接收插件声明。通用 Skill 不能假定专属 Hook 一定生效。若业务依赖某项扩展，宿主必须在启用该任务前检查支持情况。

## 练习

给样例增加一个 weekly-review Skill，保持标准 Manifest 不变。解释为什么新增 Skill 不需要向 plugin.json 写入 skills 路径，以及为什么安装插件不会自动授予写日历权限。
