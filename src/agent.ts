import OpenAI from "openai";
import dotenv from "dotenv";
import { PERSONAL_SYSTEM_PROMPT } from "./profile.js";
import { agentTools, executeTool } from "./tools.js";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

export class PersonalAgent {
  private messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: PERSONAL_SYSTEM_PROMPT },
  ];

  // 1. 普通命令行对话（支持工具循环）
  async chat(userInput: string): Promise<string> {
    this.messages.push({ role: "user", content: userInput });

    while (true) {
      const response = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: this.messages,
        tools: agentTools,
        tool_choice: "auto",
      });

      const message = response.choices[0]?.message;
      if (!message) return "抱歉，没有收到回复。";

      this.messages.push(message);

      // 如果模型触发了工具调用
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
        // 带着工具执行结果继续让模型思考
        continue;
      }

      return message.content || "";
    }
  }

  // 2. 流式对话（支持工具调用 + 边执行边打字流式吐出）
  async *chatStream(userInput: string): AsyncGenerator<string, void, unknown> {
    this.messages.push({ role: "user", content: userInput });

    while (true) {
      // 第一步：先探查是否需要调用工具（非 stream 形式判断意图更稳健）
      const checkRes = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: this.messages,
        tools: agentTools,
        tool_choice: "auto",
      });

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
            // 给前端先吐一个状态提示
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
        // 执行完工具，进入下一轮（将工具结果流式总结给用户）
        continue;
      }

      // 不需要调工具（或工具已经执行完毕），直接以 Stream 方式打字吐给前端
      // 把刚刚已经生成的回复文本或者新发起的流式请求推给前端
      const stream = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: this.messages,
        stream: true,
      });

      let fullReply = "";
      for await (const chunk of stream) {
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

  // 清空对话记忆
  reset() {
    this.messages = [{ role: "system", content: PERSONAL_SYSTEM_PROMPT }];
  }
}
