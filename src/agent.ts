import OpenAI from "openai";
import dotenv from "dotenv";
import { PERSONAL_SYSTEM_PROMPT } from "./profile.js";
import { agentTools, executeTool } from "./tools.js";
import { CostGuard } from "./costGuard.js";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

export class PersonalAgent {
  private messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: PERSONAL_SYSTEM_PROMPT },
  ];

  // 1. 普通对话（支持工具循环 + 预算检查）
  async chat(userInput: string): Promise<string> {
    // 熔断拦截
    const budgetCheck = CostGuard.isBudgetExceeded();
    if (budgetCheck.exceeded) {
      return `⚠️ 抱歉，${budgetCheck.reason} 为保护主人钱包，AI 对话功能已自动熔断暂停。如需沟通请直接留下联系方式，或点击右上角下载简历！`;
    }

    this.messages.push({ role: "user", content: userInput });

    while (true) {
      const response = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: this.messages,
        tools: agentTools,
        tool_choice: "auto",
      });

      if (response.usage) {
        CostGuard.recordUsage(
          response.usage.prompt_tokens,
          response.usage.completion_tokens
        );
      }

      const message = response.choices[0]?.message;
      if (!message) return "抱歉，没有收到回复。";

      this.messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === "function") {
            const toolResult = await executeTool(
              toolCall.function.name,
              toolCall.function.arguments
            );
            this.messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            });
          }
        }
        continue;
      }

      return message.content || "";
    }
  }

  // 2. 流式对话（支持工具调用 + 预算拦截 + Token 累计）
  async *chatStream(userInput: string): AsyncGenerator<string, void, unknown> {
    // 预算熔断拦截
    const budgetCheck = CostGuard.isBudgetExceeded();
    if (budgetCheck.exceeded) {
      yield `⚠️ **抱歉，${budgetCheck.reason}**\n\n为保护主人钱包，AI 对话功能已自动熔断暂停。如需沟通，欢迎在页面留言留下联系方式，或点击右上角下载完整简历！`;
      return;
    }

    this.messages.push({ role: "user", content: userInput });

    while (true) {
      const checkRes = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: this.messages,
        tools: agentTools,
        tool_choice: "auto",
      });

      if (checkRes.usage) {
        CostGuard.recordUsage(
          checkRes.usage.prompt_tokens,
          checkRes.usage.completion_tokens
        );
      }

      const checkMsg = checkRes.choices[0]?.message;
      if (!checkMsg) {
        yield "抱歉，连接异常。";
        return;
      }

      // 如果触发了工具调用
      if (checkMsg.tool_calls && checkMsg.tool_calls.length > 0) {
        this.messages.push(checkMsg);

        for (const toolCall of checkMsg.tool_calls) {
          if (toolCall.type === "function") {
            yield `\n> ⚙️ *[Agent 正在调用工具: ${toolCall.function.name}...]*\n\n`;

            const toolResult = await executeTool(
              toolCall.function.name,
              toolCall.function.arguments
            );

            this.messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            });
          }
        }
        continue;
      }

      // 文本生成流
      const stream = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: this.messages,
        stream: true,
        stream_options: { include_usage: true }, // 让流式响应也返回 token 统计
      });

      let fullReply = "";
      for await (const chunk of stream) {
        if (chunk.usage) {
          CostGuard.recordUsage(
            chunk.usage.prompt_tokens,
            chunk.usage.completion_tokens
          );
        }
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullReply += text;
          yield text;
        }
      }
      this.messages.push({ role: "assistant", content: fullReply });
      break;
    }
  }

  reset() {
    this.messages = [{ role: "system", content: PERSONAL_SYSTEM_PROMPT }];
  }
}
