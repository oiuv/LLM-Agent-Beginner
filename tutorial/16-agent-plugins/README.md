# 阶段 16：Agent Plugins——封装与分发 Agent 能力

> 前置知识：阶段 5、6、8、13
>
> 里程碑：按公开规范组织一个插件，说明宿主怎样加载、授权和验证它

## 为什么需要 Plugin

错题诊断和引导练习可以各自作为 Skill，整数验算可以由 MCP Server 提供。把这些能力交给另一个 Agent 使用时，还需要统一的包身份、目录和发现方式。Plugin 就是这一层封装；“学习导师”是插件服务的领域场景。

本章采用 [Agent Plugins 1.0.0](https://agent-plugins.org/specification)，查阅日期为 2026-10-19。可移植组件是 Skills 和 MCP Servers；Hooks 等宿主专属能力通过客户端扩展处理。规范约束包格式与加载契约，安装界面、市场和升级运营由客户端负责。[官方入门](https://agent-plugins.org/plugin-authors/build-an-agent-plugin)

| 机制 | 职责 |
|---|---|
| Skill | 提供进入上下文的任务方法与工作流程 |
| Tool | 执行具体动作 |
| MCP | 标准化外部能力的发现与调用 |
| Hook | 在运行时事件节点观察或干预 |
| Plugin | 把可复用能力组织成可分发的包 |
| Marketplace | 帮助用户发现、获取和管理分发来源 |

一个插件可以只包含 Skills，不必为了完整目录而添加 MCP 或宿主扩展。

## 学习路线

| 阅读 | 要解决的问题 |
|---|---|
| [01 标准格式](01-package-format.md) | 哪些文件和字段可以跨客户端使用 |
| [02 加载与运行边界](02-loading-runtime.md) | 怎样发现组件、隔离故障并接入已有 Runtime |
| [03 分发与评测](03-distribution-evaluation.md) | 怎样处理市场、版本、信任和验收 |
| [学习导师插件](../../examples/learning-coach-plugin/README.md) | 检查一个实际标准目录与两项 Skill |

建议先阅读样例的 plugin.json，再分别打开 SKILL.md 和 mcp.json，最后运行根目录检查：

~~~sh
npm run check:plugins
npm run check:docs
~~~

## 本项目实现到哪一步

示例包含标准 Manifest、两个 Skill、相应参考资料，以及指向本地教学 MCP 服务的配置。校验脚本使用固定版本的官方 Schema，并检查样例的 Skill 元数据和包内路径。

本项目尚未实现通用插件安装器或把文件自动装入 AgentKernel 的适配器。校验通过说明已覆盖的静态检查通过；不代表真实宿主兼容、模型触发准确、工具已连接或插件已上架。宿主接入作为本章练习，MCP 服务可按样例说明单独验证。

## 完成标准

- 能解释插件、Skill、MCP、Hook 和市场的分工；
- 插件目录通过静态检查，Skill 不引用包外文件；
- 能区分包格式错误、某个组件不可用和任务无法完成；
- 不把用户凭证、Thread 或学习记录写进发布包；
- 接入宿主后，用真实工具结果与执行轨迹验证行为。

官方资料：[规范](https://agent-plugins.org/specification)、[作者指南](https://agent-plugins.org/plugin-authors/build-an-agent-plugin)、[客户端检查清单](https://agent-plugins.org/client-implementers/conformance)。
