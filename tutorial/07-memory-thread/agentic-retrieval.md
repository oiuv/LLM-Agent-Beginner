# Agent 如何决定检索与使用证据

检索系统回答“哪些资料可能相关”；Agent 决定“现在缺什么信息、调用哪个来源、证据是否足够、接下来做什么”。MCP 可以暴露检索工具，两者可以组合，不能互相替代。

Embedding、切分、向量库、混合检索、重排、召回率与 RAG 评测统一在 [LLM Embedding Beginner](https://github.com/oiuv/LLM-Embedding-Beginner) 学习。

## 最小检索契约（设计示意）

~~~ts
interface Evidence {
  sourceId: string;
  excerpt: string;
  observedAt: string;
  locator?: string;
}

interface RetrievalResult {
  evidence: Evidence[];
  missing: string[];
}
~~~

权限过滤在检索服务与 Host 中执行。返回的文本属于数据，不得升级为系统指令。相关性分数也不是事实正确率。

## 控制流程

1. 根据当前任务列出未知项，例如课程要求、题目出处、用户测验记录。
2. 判断是否真的需要检索：已有可信上下文足够时可直接处理。
3. 选择来源：用户记录、课程资料或当前外部事实分别查询。
4. 检查覆盖、时效、来源和冲突；必要时有界改写查询或换来源。
5. 证据足够才生成带出处的交付物；不足则澄清、报告缺口或交给人工。
6. 达到调用或时间预算后停止，不把“没有结果”写成“事实不存在”。

例如两个教材给出不同定义：保留两个来源及适用范围，确认当前课程使用哪一套；不能悄悄拼接成新的定义。

## 示例与实现边界

[学习计划实验](../../examples/learning-agent-runtime/src/study-workflow.ts) 用本地资源目录演示并行读取与缺口阻断，没有实现向量检索、重排或 Agent 自主查询改写。

接入真实检索时，把检索服务封装为 Tool，再沿现有 ToolExecutor 路径执行。不要为了接入检索另建一套 Agent 循环。

## 验收练习

固定四类输入：无需检索、证据充分、来源冲突、无可用证据。检查是否调用了正确来源、引用能否对应结果、预算是否生效、证据不足时是否避免编造。检索召回质量与 Agent 的决策质量分别统计。
