import { ChatCompletionTool } from "openai/resources";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { localRAG } from "./rag.js";
import { Notifier } from "./notifier.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. 定义给 DeepSeek 大模型看的工具清单
export const agentTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_github_projects",
      description: "获取吴琦真实的 GitHub 公开项目动态及在研项目。当访客明确询问开源项目、代码仓库时调用。",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "leave_message",
      description: "当访客想联系吴琦、合作、招聘、邀约面试或留下联系方式时，调用此工具登记留言。",
      parameters: {
        type: "object",
        properties: {
          visitorName: {
            type: "string",
            description: "访客姓名或称呼",
          },
          contact: {
            type: "string",
            description: "访客的联系方式（手机号、微信、邮箱等）",
          },
          content: {
            type: "string",
            description: "留言的具体诉求或合作意向",
          },
        },
        required: ["visitorName", "contact", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "download_resume",
      description: "当访客或 HR 想要获取、查看、索要、下载吴琦的简历 PDF 时调用此工具提供下载链接。",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "检索吴琦的本地知识库、简历与详细技术攻关文档。当访客问到教育经历、具体项目架构细节、并发攻关、技术复盘时调用。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "检索关键词，如 '教育背景'、'电子考试系统'、'高并发缓存'、'AI组卷'",
          },
        },
        required: ["query"],
      },
    },
  },
];

// 2. 工具具体执行
export async function executeTool(name: string, argsStr: string): Promise<string> {
  let args: any = {};
  try {
    args = JSON.parse(argsStr || "{}");
  } catch (e) {
    return JSON.stringify({ error: "解析参数失败" });
  }

  // 工具 1：获取 GitHub 仓库
  if (name === "get_github_projects") {
    const githubUser = process.env.GITHUB_USERNAME || "2454435987";

    try {
      const res = await fetch(`https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=10`, {
        headers: { "User-Agent": "Avatar-Agent" },
      });

      let onlineRepos = [];
      if (res.ok) {
        const repos: any = await res.json();
        onlineRepos = repos.map((r: any) => ({
          name: r.name,
          stars: r.stargazers_count,
          description: r.description || "个人代码仓库",
          url: r.html_url,
        }));
      }

      return JSON.stringify({
        githubUser,
        profileUrl: `https://github.com/${githubUser}`,
        onlineRepos,
        featuredProjects: [
          {
            name: "my-avatar-agent (个人 AI 数字分身)",
            tech: "TypeScript, Express, DeepSeek, Tool Calling, SSE",
            description: "具备自主工具调度与流式响应的数字分身 Agent，挂载简历本地 RAG 检索引擎。",
          },
          {
            name: "基于 SpringCloud 的电子考试系统",
            tech: "SpringBoot 3, SpringCloud Alibaba, RabbitMQ, Redis, Vue3",
            description: "全栈高可用在线考试平台，支撑统一鉴权、AI组卷与高并发流量治理。",
          },
        ],
      });
    } catch (err: any) {
      return JSON.stringify({ error: `请求 GitHub 失败: ${err.message}` });
    }
  }

  // 工具 2：访客留言登记
  if (name === "leave_message") {
    try {
      let messages: any[] = [];
      if (fs.existsSync(MESSAGES_FILE)) {
        const fileContent = fs.readFileSync(MESSAGES_FILE, "utf-8");
        messages = JSON.parse(fileContent || "[]");
      }

      const newMessage = {
        id: Date.now().toString(),
        time: new Date().toLocaleString("zh-CN"),
        visitorName: args.visitorName,
        contact: args.contact,
        content: args.content,
      };

      messages.push(newMessage);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");

      // 异步触发微信/邮件实时通知，不阻塞 Agent 主回复链路
      Notifier.notify(newMessage).catch((e) => console.error(e));

      return JSON.stringify({
        status: "success",
        message: "留言已成功存入本地留言本，并已通过实时通道通知吴琦！",
      });
    } catch (err: any) {
      return JSON.stringify({ error: `记录留言失败: ${err.message}` });
    }
  }

  // 工具 4：提供简历下载
  if (name === "download_resume") {
    return JSON.stringify({
      status: "ready",
      downloadUrl: "/api/download-resume",
      fileName: "吴琦-全栈开发-个人简历.pdf",
      note: "简历已准备好。请在回复中生成一条醒目的 Markdown 下载链接，格式建议为：[📄 点击下载：吴琦-全栈开发-个人简历.pdf](/api/download-resume)，并礼貌欢迎对方阅览或进一步沟通。",
    });
  }

  // 工具 3：检索本地知识库 (RAG)
  if (name === "search_knowledge_base") {
    const query = args.query || "";
    const result = await localRAG.search(query);
    return JSON.stringify({
      query,
      result,
    });
  }

  return JSON.stringify({ error: `未知工具: ${name}` });
}
