# 阶段 6：Skills 系统

> 前置知识：阶段 3～5  
> 里程碑：Agent 能发现、加载和执行一个可测试的领域 Skill

## Skill 解决什么

Tool 告诉 Agent“能做什么”，Skill 告诉 Agent“某类任务怎样做得稳定”。例如 generate_quiz 是 Tool；“根据知识状态生成一次诊断测验”是 Skill。

设计一套可维护的 Skill 时，文件、测试与宿主配置共同提供：

- 名称、描述和触发条件；
- 适用与不适用场景；
- 所需 Tools、Resources 或其他 Skills；
- 工作步骤和决策原则；
- 安全约束；
- 输出格式；
- 示例；
- 测试与版本。

Skill 的步骤与约束进入模型上下文，执行质量需要评测。必须在工具调用前发生的检查、完成前验收和结束收尾，应放入 Runtime 的策略或 [Hooks](../08-execution-runtime/hooks.md)，不能只依赖模型记住 Skill 中的要求。

## Skill 数据模型

[文件规范](specification.md) 定义 SKILL.md；[SkillManifest 与 LoadedSkill](../../examples/learning-agent-runtime/src/skills.ts) 是本项目内部接口，二者需要适配。version、triggers、requiredTools、risk 不是通用标准的必填顶层字段。

当前 SkillRegistry 支持索引、依赖检查与惰性加载，没有文件解析器或 SkillRunner。下文的 Runner 是实现练习。

## Progressive Disclosure

为避免上下文膨胀，分三步加载：

1. 启动时只索引名称、描述、触发条件；
2. 匹配任务后加载完整说明；
3. 只有执行到具体步骤时才读取大型参考资料或脚本。

不要把所有 Skill 全文放入系统提示词。

## Skill 匹配

匹配信号包括：

- 用户明确指定；
- 任务语义和触发描述；
- 当前领域；
- 输入类型；
- 所需工具是否可用；
- 用户和组织策略；
- 历史成功率。

低置信度或多个 Skill 冲突时，向用户确认或让路由器在有限候选中选择。

## Skill Runner

~~~
任务输入
  ↓
Skill Matcher
  ↓
加载 Skill + 校验依赖
  ↓
过滤 Tool Registry
  ↓
把说明和输出约束加入 Context
  ↓
Agent Kernel 执行
  ↓
验证 Skill 的完成条件
~~~

Skill 不应自行绕开 Kernel 执行危险工具。所有动作仍经过 Tool Executor 和 Policy Engine。

## Skill 与固定工作流

- Skill：提供模型可解释的流程知识，允许在边界内调整。
- Workflow：代码确定状态迁移和执行顺序。

高风险步骤应使用固定 Workflow；开放分析可由 Skill 指导模型完成。二者可以组合。

## 示例：错题诊断的内部配置

~~~
name: diagnose-mistakes
triggers:
  - 分析错题
  - 找出薄弱知识点
requiredTools:
  - read_artifact
  - lookup_knowledge
  - save_learning_report

步骤：
1. 确认题目、学生答案和标准答案齐全。
2. 按知识点和错误类型分类。
3. 每个诊断必须附证据。
4. 不确定时生成澄清问题，不猜测。
5. 输出结构化诊断报告。
~~~

## 版本、信任与安全

- Skill 来源必须可识别；
- 安装前检查声明的工具和权限；
- 高风险 Skill 需要审批或签名；
- 更新后运行回归评测；
- Trace 保存 Skill 名称和版本；
- Skill 内容不能覆盖系统级安全策略。

## Skill 评测

至少评估：

- 触发准确率；
- 不应触发时的误触发率；
- 必需步骤完成率；
- 工具选择正确率；
- 输出格式通过率；
- 任务成功率；
- token 和时间成本；
- 安全违规数。

## 常见错误

1. 一个 Tool 对应一个 Skill，造成无意义重复。
2. Skill 描述过宽，几乎所有请求都会触发。
3. 把账号密钥或环境配置写进 Skill。
4. 只测试最终文本，不测试步骤与工具调用。
5. Skill 可以修改系统策略。

## 练习与验收

创建 diagnose-mistakes Skill，并测试应触发、相似但不应触发、缺少工具和危险内容四种情况。

验收标准：

- 启动时只加载 Skill 元数据；
- 激活后才加载完整内容；
- 缺少 requiredTools 时明确失败；
- 所有工具仍经过统一执行策略；
- Trace 包含 Skill 版本。

## 延伸阅读

- [Skill 规范](specification.md)
- [Skill 创建指南](authoring.md)
- [Skill 评估](evaluation.md)
- [Tool 与 Skill 发现](discovery.md)

- [快速实验](quickstart.md)
- [加载与文件适配](loading.md)
- [领域设计练习](examples.md)
