# 个人深度经历与技术攻关复盘

## 项目 1：分布式高并发电商系统 / 订单中心重构
- **技术栈**：TypeScript, Node.js, Redis, RabbitMQ, PostgreSQL
- **业务背景**：大促期间订单流量突增 10 倍，原架构存在严重的数据库连接池打满和缓存穿透、缓存雪崩隐患。
- **核心攻关亮点**：
  1. **缓存击穿与雪崩防御**：采用“互斥互斥锁（Redlock）+ 随机过期时间兜底”策略，防止热点商品 SKU 过期瞬时压垮数据库。
  2. **削峰限流**：使用 RabbitMQ 进行订单延迟处理与流量削峰，保证核心主链路 TP99 维持在 80ms 以内。
  3. **数据一致性**：引入本地消息表（Local Message Table）保障分布式事务最终一致性，抗住峰值 5000+ QPS。

## 项目 2：个人 AI 数字分身 Agent 系统 (my-avatar-agent)
- **技术栈**：TypeScript, Express, DeepSeek API, Tool Calling, SSE 流式渲染
- **核心攻关亮点**：
  1. **自主工具调用循环 (Tool Call Loop)**：通过大模型 Function Calling 协议，实现自主研判意图、调取外部 API（GitHub 仓库、留言入库）后再综合总结回复。
  2. **打字机流式输出 (SSE Streaming)**：使用异步生成器 (AsyncGenerator) 与 HTTP Transfer-Encoding: chunked，首字返回时间低于 300ms。
  3. **本地 RAG 知识检索**：结合轻量级向量与关键词语义分块，支持本地 Markdown 沉浸式知识库检索，避免模型上下文幻觉。

## 学习理念与职业规划
- **为什么热爱全栈开发**：享受端到端从数据流设计到用户直观交互的全链路落地感。
- **对 AI 时代的看法**：AI 不是替代程序员，而是重塑交互范式；懂业务、懂工程化并能指挥 Agent 的全栈工程师更有核心价值。
