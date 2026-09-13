# Learning Coach Expert Package 示例

这是阶段 16 的供应商无关**设计样例**。它展示专家定义如何声明身份、方法论、Skills、能力依赖、记忆边界、自动化模板和拟议的发布评测。

它不是一个独立 Agent Runtime，也不会自行获得工具权限。本项目还没有读取这个格式的安装器或评测执行器；正式实现时，应先校验并编译本目录，再由 Runtime 创建 ExpertInstallation 和用户级 ExpertBinding。

## 阅读顺序

1. 从 [expert.yaml](expert.yaml) 理解包入口与依赖；
2. 对照 IDENTITY.md、SOUL.md 和 AGENTS.md 区分身份、人格与操作纪律；
3. 对照 references/、skills/ 和能力策略理解判断、流程和动作；
4. 检查 Memory 与 Automation 只声明策略和模板；
5. 阅读 evals/cases.json，讨论未来安装和发布时如何执行这些用例。

## 运行时边界

- Package 内没有真实学生资料、Thread、Memory、Token 或 OAuth 凭证；
- tool-policy.yaml 是能力需求与策略提示，不是授权记录；
- automations.yaml 中的模板默认关闭，不是已经运行的 Job；
- evals/cases.json 是评测用例草案。当前没有 fixture、断言实现或评分器，不能由文件中的 minimumScore 推断实际通过率。
