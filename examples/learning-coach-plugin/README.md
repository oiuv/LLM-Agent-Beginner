# Learning Coach：标准 Agent Plugin 示例

本目录按 Agent Plugins 1.0.0 组织学习能力。plugin.json 定义包身份，skills/ 包含两个标准 Skill，mcp.json 提供一个本地整数加法服务连接。这里的“导师”是使用场景，不需要另一种包格式。

## 阅读顺序

1. [plugin.json](plugin.json)：包名、版本与规范声明。
2. [错题诊断](skills/diagnose-mistakes/SKILL.md)：从学生真实作答中提取证据。
3. [引导练习](skills/guided-practice/SKILL.md)：分级提示并等待新的尝试。
4. [mcp.json](mcp.json)：可用于整数加法核验的 MCP 配置。

两项 Skill 的基本流程可以在没有 MCP 的情况下使用；若某一步需要工具核验而服务不可用，必须标明未核验。该服务只会整数加法，不是完整数学求解器。

## 静态检查

在本教程仓库根目录：

~~~sh
npm install
npm run check:plugins
~~~

此命令检查标准 JSON Schema、Skill 元数据与样例的包内路径。它不安装插件，也不启动模型或外部服务。

## 验证 MCP 连接

需要 Python 3.10+ 和 uv。在本教程仓库根目录打开终端一：

~~~sh
uv sync --project examples/mcp-http --locked
uv run --project examples/mcp-http mcp run examples/mcp-http/server.py --transport streamable-http
~~~

服务地址为 http://localhost:8000/mcp。在终端二运行：

~~~sh
npm run test:plugin-mcp
~~~

测试从本插件的 mcp.json 读取地址，通过已有 Python SDK 调用 add(19, 23)，预期 result=42。测试后在终端一停止服务。

这只验证配置中的服务能连接和调用，不代表插件已被某个真实 Agent 宿主加载。

## 接入真实宿主

使用支持 Agent Plugins 1.0.0 的客户端提供的本地目录加载方式，选择本目录。检查它是否支持 Skills，以及连接本例所需的 Streamable HTTP；确认实际发现的技能与工具，再执行下面的试用输入。不要把本目录直接当作某个客户端的原生插件配置。

- “题目是 19 + 23。我算成 32，过程是先算 9 + 3 = 12，把 2 写下后直接算 1 + 2。帮我找出错误。”
- “给我一道整数加法练习，每次只给一个提示，让我自己完成。”
- “这道题怎么做？”——没有学生作答时，不能编造错题诊断。

本样例不包含用户真实数据、自动提醒或客户端专属 Hooks。用户状态、权限、调度和完成验收由宿主接入。

官方资料：[插件规范](https://agent-plugins.org/specification)、[Agent Skills](https://agentskills.io/specification)。
