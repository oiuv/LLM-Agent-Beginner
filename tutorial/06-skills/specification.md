# Skill 文件格式与运行时契约

本章区分 [Agent Skills 文件规范](https://agentskills.io/specification) 与本项目自己的加载接口，避免把某个实现的扩展字段写成通用标准。

## 文件格式

一个 Skill 是目录，必需文件为 SKILL.md，正文使用 Markdown，开头使用 YAML frontmatter：

~~~markdown
---
name: diagnose-mistakes
description: 根据用户提供的错题和作答过程诊断误区；需要区分概念错误与计算错误时使用。
---

先检查题目和作答是否完整，再引用具体证据给出诊断。
缺少关键信息时请求补充，不编造学生的解题过程。
~~~

必需字段：

- name：与目录名一致；最长 64 字符，使用小写字母、数字与连字符，不能以连字符开头或结尾，也不能连续使用连字符。
- description：说明做什么以及何时使用，最长 1024 字符。

可选字段包括 license、compatibility、metadata；allowed-tools 是实验性字段，宿主支持情况不同。scripts、references、assets 可按需组织。精确约束以链接规范为准。

## 项目内部接口

[SkillManifest](../../examples/learning-agent-runtime/src/skills.ts) 包含 version、triggers、requiredTools、risk。它们是教学运行时的内部字段，不能假定所有 SKILL.md 都有这些顶层字段。

文件适配器可以从 metadata 或宿主配置转换内部字段，但需要显式映射并检查默认值。目前示例直接注册 TypeScript 对象，没有实现文件适配器或 YAML 解析器。

## 加载不等于授权

Skill 说明怎样完成任务，requiredTools 说明依赖。实际调用仍由 ToolRegistry、用户权限、Policy Engine 和审批决定。即使文件声明 allowed-tools，也不能自行扩大账号权限。

## 练习

分别列出一个 Skill 的标准文件字段、内部索引字段、安装配置与用户授权。检查每个字段的来源，不把用户凭证放进 Skill 文件。
