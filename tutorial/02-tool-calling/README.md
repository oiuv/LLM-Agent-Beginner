# 阶段 2：Tool Calling

> 前置知识：阶段 1  
> 里程碑：模型能选择工具，运行时能安全执行并返回 Observation

## Tool Calling 解决什么

模型不能直接读取真实文件、数据库或外部账号。Tool Calling 让模型提出结构化动作，由受控运行时决定是否执行。

~~~
Model：建议调用 search_knowledge({ topic: "分数" })
Runtime：验证工具、参数、权限和预算
Executor：执行实际查询
Runtime：把结果包装为 tool_result
Model：根据结果回答或继续调用
~~~

## Tool 的最小接口

直接阅读 [Tool、ToolContext 与 ToolResult](../../examples/learning-agent-runtime/src/types.ts)。Tool 包含名称、版本、描述、输入 Schema、副作用类别、validate 与 execute。ToolContext 传递用户、Thread、traceId 和取消信号。

描述向模型说明用途与适用边界；validate 是运行时校验，不能被 TypeScript 类型替代。工具名称尽量稳定，不把无关动作塞进同一个 Tool。

## Tool Registry

注册表承担：

- 工具名唯一性；
- 描述和 Schema 暴露；
- 执行器查找；
- 每用户或每任务可见性过滤；
- 策略元数据和版本管理。

实现见 [ToolRegistry](../../examples/learning-agent-runtime/src/tools.ts)。

## 执行前检查

模型提出调用后，按顺序检查：

1. 工具是否存在且当前可见；
2. 参数能否解析；
3. 参数是否满足 Schema；
4. 用户是否有权限；
5. 是否超出次数、成本或时间预算；
6. 是否需要人工审批；
7. 是否提供幂等键；
8. 当前 Run 是否已取消。

不要把“模型选择了工具”误认为“系统授权执行”。

## 工具循环

以下是教学伪代码；可运行实现与停止路径见 [AgentKernel](../../examples/learning-agent-runtime/src/agent.ts)。

~~~ts
for (let step = 0; step < maxSteps; step += 1) {
  const decision = await model.decide({ messages, tools });

  if (decision.type === "answer") return decision.content;
  if (decision.type === "request_input") return waitForUser(decision.question);

  for (const call of decision.calls) {
    const result = await executeValidated(call);
    messages.push(asToolMessage(call, result));
  }
}

throw new Error("Agent exceeded max steps");
~~~

最大步数是必要保险，但还应有时间、token、费用和工具次数预算。

## 串行还是并行

只有互不依赖、无冲突副作用的调用才能并行。

- 查询两个独立知识库：通常可并行。
- 先创建学习计划再写入日历：必须串行。
- 同时修改同一个文件：需要锁或顺序执行。
- 多个写操作：先检查是否可以回滚或补偿。

运行时而不是模型最终决定是否并行。

## Tool Result

结果应区分业务失败和系统异常：

~~~json
{
  "ok": false,
  "content": null,
  "error": {
    "code": "KNOWLEDGE_NOT_FOUND",
    "message": "未找到该知识点",
    "retryable": false
  }
}
~~~

不要把所有异常转成一段自然语言。结构化错误有助于重试、重规划、评测和用户展示。

## 幂等与副作用

读取工具通常可安全重试；发送消息、扣费、创建日历事件等工具必须接收 idempotencyKey。运行时保存调用记录，再次执行相同键时返回原结果。

## 常见错误

1. 模型输出什么工具名就执行什么。
2. 只做 TypeScript 类型声明，不做运行时 Schema 校验。
3. 在工具描述中泄露管理员能力。
4. 对写操作自动无限重试。
5. 把大文件内容直接放进 Tool Result。

## 练习与验收

实现 calculator、get_topic 和 save_note 三个工具；save_note 标记为 write，并要求审批。

验收标准：

- 未注册工具被拒绝；
- 非法参数不会进入执行器；
- Tool Result 总是结构化；
- 写操作支持幂等键；
- 循环达到预算时确定性停止。

## 延伸阅读

- [Function Calling 机制](function-calling.md)
- [Tool 定义](../05-tools-mcp-connectors/mcp/server/02-tool-definition.md)

