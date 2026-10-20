import type { ChatCompletionTool } from "openai/resources";
import { localRAG } from "./rag.js";

// 1. 定义给 DeepSeek 大模型看的工具清单
export const agentTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_github_projects",
      description: "获取吴琦真实的 GitHub 公开项目动态、开源代表作及《从零开始的编程之旅》全栈成长时间线。当访客明确询问开源项目、代码仓库或有哪些具体项目时调用。",
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
      description: "检索吴琦的本地知识库、简历与详细技术攻关文档。当访客问到教育经历、具体项目架构细节（如SpringCloud微服务、桶装水系统、社区养老小程序、茶文化APP、宠物社交、并发治理等）时调用。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "检索关键词，如 'SpringCloud游戏商城'、'桶装水配送系统'、'社区养老小程序'、'茶文化APP'、'微服务Nacos' 等",
          },
        },
        required: ["query"],
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
];

// 2. 工具具体执行
export async function executeTool(name: string, argsStr: string): Promise<string> {
  let args: any = {};
  try {
    args = JSON.parse(argsStr || "{}");
  } catch (e) {
    return JSON.stringify({ error: "解析参数失败" });
  }

  // 工具 1：获取 GitHub 仓库与代表作体系
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
          description: r.description || "个人公开代码仓库",
          url: r.html_url,
        }));
      }

      return JSON.stringify({
        githubUser,
        profileUrl: `https://github.com/${githubUser}`,
        onlineRepos,
        programmingJourneyOverview: {
          repoName: "my-programming-journey",
          repoUrl: `https://github.com/${githubUser}/my-programming-journey`,
          description: "吴琦从零开始的编程全栈成长时间线仓库，真实收录了从 2023 至今的各大完整项目源码、数据库与文档：",
          subProjects: [
            {
              title: "🎮 基于 SpringCloud 的分布式游戏商城系统 (2025-06)",
              tech: "Spring Cloud Alibaba, Nacos, OpenFeign, MyBatis-Plus",
              description: "分布式父子工程微服务架构，涵盖 common-api、shop-service 核心中台与 shop-web 前端聚合。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/03-企业级架构与微服务%20(2025)/2025-基于SpringCloud的游戏商城`,
            },
            {
              title: "💧 桶装水配送全流程数字化管理系统 (2025-09)",
              tech: "Spring Boot 3.1.5, Vue 3, Vite, Element Plus, H5移动端",
              description: "前后端分离进销存与调度系统，打通 PC 管理中台、配送员移动端 H5 与后端 API 闭环。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/03-企业级架构与微服务%20(2025)/2025-09-桶装水配送管理系统`,
            },
            {
              title: "🧓 社区养老志愿者互助微信小程序 (2024-03)",
              tech: "Spring Boot 2.7, Uni-app (Vue 3), 微信小程序, HikariCP",
              description: "老人大字关怀模式 + 一键 SOS 求助 + 青年志愿者推单接单与爱心积分激励互助平台。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/02-实战进阶与小程序%20(2024)/2024-03-社区养老志愿者微信小程序`,
            },
            {
              title: "🍵 茶文化主题 APP 与管理中台 (2024-06)",
              tech: "Spring Boot, Vue 3 PC端, Uni-app 移动端跨端, MyBatis-Plus",
              description: "茶文化知识科普百科 + 茶品在线商城 + 茶友动态交流社群三位一体全栈平台。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/02-实战进阶与小程序%20(2024)/2024-06-茶文化主题APP与管理中台`,
            },
            {
              title: "🐱 宠物管理与社交分享系统 (2024-10)",
              tech: "Spring Boot, 原生微信小程序, MyBatis, MySQL",
              description: "流浪动物救助领养审核 + 宠物用品商城 + 宠友发帖互动交流闭环。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/02-实战进阶与小程序%20(2024)/2024-10-宠物管理与社交分享系统`,
            },
            {
              title: "🏥 医院在线预约挂号调度系统 (2023-11)",
              tech: "JSP, Servlet, JavaBean, 原生 JDBC, Tomcat",
              description: "卓越工程师实训组长主导项目，拥有全套规范立项书、需求规格说明书与排班预约闭环。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/01-萌芽与基础课设%20(2023)/2023-11-医院预约挂号系统`,
            },
            {
              title: "🍅 番茄影院桌面售票与排片系统 (2023-06)",
              tech: "Java Swing, AWT, 原生 JDBC, MySQL",
              description: "大学阶段端到端 Java 桌面应用，含可视化选座购票与后台排片运营。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/01-萌芽与基础课设%20(2023)/2023-06-番茄影院售票系统`,
            },
          ],
        },
        featuredProjects: [
          {
            name: "my-avatar-agent (个人 AI 数字分身)",
            tech: "TypeScript, Express, DeepSeek, Tool Calling, SSE",
            description: "具备自主工具调度与流式响应的数字分身 Agent，挂载简历本地 RAG 检索引擎。",
            url: `https://github.com/${githubUser}/my-avatar-agent`,
          },
          {
            name: "基于 SpringCloud 的分布式游戏商城系统",
            tech: "Spring Cloud Alibaba, Nacos, OpenFeign, MyBatis-Plus",
            description: "分布式父子工程微服务架构，包含公共模型层、业务中台与前端聚合网关。",
            url: `https://github.com/${githubUser}/my-programming-journey`,
          },
          {
            name: "桶装水配送全流程数字化管理系统",
            tech: "Spring Boot 3, Vue 3, Vite, Element Plus, H5移动端",
            description: "企业级前后端分离系统，打通 PC 进销存中台、骑手移动端 H5 与客户订单闭环。",
            url: `https://github.com/${githubUser}/my-programming-journey`,
          },
        ],
      });
    } catch (err: any) {
      return JSON.stringify({ error: `请求 GitHub 失败: ${err.message}` });
    }
  }

  // 工具 2：检索本地知识库 (RAG)
  if (name === "search_knowledge_base") {
    const query = args.query || "";
    const result = await localRAG.search(query);
    return JSON.stringify({
      query,
      result,
    });
  }

  // 工具 3：提供简历下载
  if (name === "download_resume") {
    return JSON.stringify({
      status: "ready",
      downloadUrl: "/api/download-resume",
      fileName: "吴琦-全栈开发-个人简历.pdf",
      note: "简历已准备好。请在回复中生成一条醒目的 Markdown 下载链接，格式建议为：[📄 点击下载：吴琦-全栈开发-个人简历.pdf](/api/download-resume)，并礼貌欢迎对方阅览或进一步沟通。",
    });
  }

  return JSON.stringify({ error: `未知工具: ${name}` });
}
