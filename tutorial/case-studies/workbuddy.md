# 产品落地案例：WorkBuddy

> 选读：完成阶段 5、6、11、16 后阅读。
>
> 目标：能把产品中的技能、连接器、专家和专家团对应到通用机制，并识别平台适配工作。
>
> 官方资料查阅日期：2026-10-20。本文是文档分析，未验证 WorkBuddy 安装、运行或市场发布。

## 从能运行到能交付

学习导师已经能调用工具、加载 Skill，但交给其他用户时，仍会遇到问题：用户不知道该安装什么、在哪里授权、缺少依赖时怎样继续，也不知道何时值得使用多个 Agent。

WorkBuddy 的资料适合用来观察这些交付问题。它把任务方法、外部能力和 Agent 角色组织成可安装、可发现的产品。教程主线讲通用架构、机制与公开规范，本案例解释具体产品如何组合它们；平台扩展可能改善体验，也会增加适配成本。

## 按这个顺序阅读官方资料

| 官方资料 | 对应课程 | 重点观察的工程问题 |
|---|---|---|
| [技能](https://open.workbuddy.cn/docs/skill) | [阶段 6：Skills](../06-skills/README.md) | 怎样为任务方法增加展示信息、发布字段和调用控制 |
| [连接器](https://open.workbuddy.cn/docs/connector) | [阶段 5：Tools、MCP 与 Connectors](../05-tools-mcp-connectors/README.md) | 怎样配置 MCP 或 CLI 接入，并处理安装与认证 |
| [专家](https://open.workbuddy.cn/docs/expert) | [阶段 15：学习 Agent](../15-capstone/README.md) | 怎样交付角色、工作方式和能力依赖明确的领域 Agent |
| [专家团](https://open.workbuddy.cn/docs/expert-team) | [阶段 11：多智能体](../11-multi-agent/README.md) | 怎样定义主理人、成员职责和协作流程 |

技能不要求读者先建立专家团，连接器也不要求一定通过专家使用。按需求组合能力，不把产品种类当成必须逐级升级的路线。

## 通用机制怎样变成产品

- **Skill**：继续用 `SKILL.md` 描述任务方法，增加多语言介绍、作者、版本及调用控制等平台约定。这些字段帮助用户发现和使用技能，不能全部视为 Agent Skills 的通用必填字段。[技能文档](https://open.workbuddy.cn/docs/skill)
- **连接器**：主要提供 MCP 与 CLI 两条接入路径。MCP 型通过 `mcp.json` 配置服务，CLI 型通过 `cli.json` 配置安装和登录等操作，再用 `connector-meta.json` 提供产品元信息。MCP 型的 Skill 可选；CLI 型强烈推荐 Skill，帮助模型理解命令。[连接器文档](https://open.workbuddy.cn/docs/connector)
- **专家**：用 `agents/*.md` 定义角色与工作方式，在 `.codebuddy-plugin/plugin.json` 中组织配置和展示信息，还可声明 MCP 或已有连接器依赖。专家描述交付什么 Agent，插件描述如何封装交付，两者可以同时成立。[专家文档](https://open.workbuddy.cn/docs/expert)
- **专家团**：增加主理人与成员关系，例如 `teamInfo`、成员定义和设置主理人的 `settings.json`。文档示例由主理人调度成员、传递阶段产出并汇总结果，这是集中协调的多 Agent 案例。[专家团文档](https://open.workbuddy.cn/docs/expert-team)

## 哪些可以复用，哪些需要适配

**先区分公开规范与平台契约。** [Agent Skills](https://agentskills.io/specification) 要求 `name` 和 `description`；WorkBuddy 的字段表把 `name` 列为可选，并额外要求中英文介绍、作者和版本。任务指令与参考资料可以作为复用基础，发布字段与引用方式应按目标宿主检查。[WorkBuddy Skill 字段](https://open.workbuddy.cn/docs/skill)

**包格式需要单独对照。** [Agent Plugins 1.0.0](https://agent-plugins.org/specification) 要求根目录 `plugin.json`，按需从 `skills/` 和 `mcp.json` 发现组件；WorkBuddy 专家使用 `.codebuddy-plugin/plugin.json`、Agent 定义及自身依赖约定。二者体现相似的封装思路，但不能只改一个文件名就宣称兼容。[WorkBuddy 专家配置](https://open.workbuddy.cn/docs/expert)

**协议兼容与产品接入分别验证。** 已有 MCP Server 可以成为接入基础，仍需核对宿主支持的传输、认证与配置。连接器文档中的最低客户端版本、安装和授权引导属于具体接入要求；服务协议测试通过不能代替用户安装与授权流程的验证。[WorkBuddy 接入要求](https://open.workbuddy.cn/docs/connector)

**协作声明还需要运行证据。** 专家团示例要求成员实际完成各自任务，主理人负责组织结果。它展示了一种 SOP，不能据此推断所有团队都强制采用相同通信方式，也不能仅凭角色文件证明委派已执行。验收仍回到阶段 11 的任务输入、成员产出、失败处理、成本与质量比较。[专家团协作示例](https://open.workbuddy.cn/docs/expert-team)

## 练习：把学习导师设计成可交付产品

这是待实现的适配练习。以现有 [学习导师插件](../../examples/learning-coach-plugin/README.md) 为基础，写一页设计：

1. **先交付单个专家**：保留错题诊断、引导练习的方法与参考资料；列出需要补充的角色说明、平台元信息和服务连接配置。用户授权在运行环境完成。
2. **说明是否需要专家团**：若引入“练习生成”和“答案审查”成员，明确它们各自的输入、输出、预算与验收条件，并说明相对单 Agent 的预期收益。
3. **设计验收路径**：正常任务应能追溯到真实工具结果和最终产出；未授权、工具不可用或成员失败时，应明确指出未完成部分及后续选择。

完成标准：能区分复用内容、平台配置与运行时责任。若实际接入，分别记录包检查、宿主运行和发布审核结果；本文和仓库中的标准插件校验不代表已通过 WorkBuddy 验证。
