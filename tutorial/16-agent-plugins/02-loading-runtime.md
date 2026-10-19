# 02：加载插件，保持运行时边界

## 加载不是执行全部内容

~~~text
插件目录
  → 定位并校验 plugin.json
  → 发现宿主支持的 Skills / MCP 配置
  → 建立 Skill 索引与 MCP 连接
  → 将可用能力接入 Runtime
  → 每次 Run 重新应用用户权限、预算和审批
~~~

加载器根据 $schema 选择本地支持的规则，不能在加载时从包提供的地址下载并执行校验逻辑。包内路径要按真实文件系统解析，符号链接或 Windows junction 也不能越出插件根目录。缺少可选组件不算错误。[官方加载流程](https://agent-plugins.org/client-implementers/loading-and-discovery)

## 故障发生在哪一层

| 问题 | 规范要求的处理范围 |
|---|---|
| Manifest 缺少必需字段、版本不支持或其他致命错误 | 拒绝整个插件，不发现或执行组件 |
| Manifest 有未知顶层字段 | 报告并忽略这些字段，其余有效时继续 |
| extensions 不是对象 | 报告并忽略该字段 |
| 客户端不认识扩展命名空间 | 忽略，不检查其内部数据 |
| skills/ 不是目录 | 该组件类型无效，其他有效组件可继续 |
| 一项 SKILL.md 无效 | 跳过该 Skill |
| mcp.json 整体无效或规范版本不匹配 | 禁用该插件的 MCP 组件 |
| 一个 MCP 条目无效、传输不支持或服务连接失败 | 跳过该服务，保留其他有效组件 |

依据：[规范的客户端一致性要求](https://agent-plugins.org/specification#11-client-conformance)、[MCP 加载规则](https://agent-plugins.org/client-implementers/mcp-runtime)。注意：作者发布检查应修复所有格式违规；运行时为了隔离故障，可以按表中规则继续加载。两种检查目的不同。

“插件还可加载”也不代表“当前任务仍能完成”。若验算工具不可用，学习 Skill 应说明不能进行工具核验，不能伪造已核验结果。

## 接入本教程的 Runtime

本项目当前需要编写适配器，不能仅复制插件目录就自动获得能力：

| 插件内容 | 接入点 | 仍由宿主决定 |
|---|---|---|
| SKILL.md 的名称、描述与正文 | SkillRegistry / Context Builder | 触发时机、上下文预算与依赖状态 |
| mcp.json 中的服务 | MCP Client → ToolRegistry | 连接授权、工具可见性与执行策略 |
| 已实现命名空间里的 Hooks | RuntimeHooks | 事件契约、顺序、超时和故障策略 |

这些是工程接入建议，不是规范规定的 TypeScript 接口。不要为插件另写一套 Agent 循环；复用已有 [Skills](../06-skills/README.md)、[MCP](../05-tools-mcp-connectors/README.md) 与 [执行器](../08-execution-runtime/README.md)。

## 包、插件数据与用户数据

| 数据 | 合适的位置 |
|---|---|
| 已发布的方法、脚本、参考资料 | 插件目录，作为固定发布内容 |
| stdio 插件的依赖、缓存、生成文件 | 宿主管理的 PLUGIN_DATA |
| 用户登录凭证 | 宿主凭证存储 |
| Thread、学习状态、审批与交付物 | Runtime 的用户或租户隔离存储 |

启动 stdio 服务时，宿主提供 PLUGIN_ROOT 和 PLUGIN_DATA，后者需在更新时保留。两个占位符只在支持的位置展开；command、远程 URL 和 HTTP headers 不做这种替换。[官方进程环境规则](https://agent-plugins.org/client-implementers/mcp-runtime)

PLUGIN_DATA 是插件安装实例的数据目录，不能自动充当多用户隔离机制。服务若处理多个用户，仍要按用户和租户检查每次访问。插件路径边界也不等于子进程沙箱。

## 主动执行与生命周期

安装学习插件不应自动创建“每天发提醒”的任务。定时执行由宿主接收明确目标、选择用户连接并创建 Scheduler Job；教学方法可以复用插件中的 Skill。调度实现见 [阶段 9](../09-scheduling/README.md)，避免再设计一套包内调度格式。

生产系统可在 Run 开始时记录所用插件版本、内容摘要和有效能力，保证执行中不混用升级后的内容。这是宿主的版本管理策略，不是 plugin.json 的额外标准字段。

## 练习与验收

设计或实现一个仅支持 Skills 的加载器，按 [官方检查清单](https://agent-plugins.org/client-implementers/conformance) 验证路径、版本、发现范围和错误隔离。先不启动外部进程，也不宣称完成了通用客户端。

再加入一个不可用的 MCP 配置，说明“独立 Skill 可加载”与“依赖该服务的任务不能完成”如何同时成立。
