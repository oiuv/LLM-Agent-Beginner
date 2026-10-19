# 第一个 Skill 实验

目标：观察“先发现，再加载”，无需安装厂商 CLI。

在仓库根目录运行：

~~~sh
npm test
~~~

阅读 [SkillRegistry](../../examples/learning-agent-runtime/src/skills.ts) 与 [对应测试](../../examples/learning-agent-runtime/src/runtime.test.ts)：

1. register 保存 manifest 与 loader，尚不加载正文。
2. find 根据触发词匹配候选，loadCount 仍为 0。
3. load 先检查 requiredTools；依赖缺失时不调用 loader。
4. 条件满足后加载正文，并核对 name 与 version。

这里用字符串触发词演示发现机制；真实系统可增加语义检索。SkillRegistry 返回指令内容，当前示例没有自动执行整套 Skill 的 SkillRunner。

下一步阅读 [文件规范](specification.md)、[加载边界](loading.md)，再按 [创作方法](authoring.md) 编写一个错题诊断流程。
