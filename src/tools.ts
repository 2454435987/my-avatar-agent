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
      description: "检索吴琦的本地知识库、简历与详细技术攻关文档。当访客问到教育经历、具体项目架构细节（如SpringCloud微服务、桶装水系统、社区养老小程序、茶文化APP、宠物社交、影院售票、医院挂号、并发治理等）时调用。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "检索关键词，如 'SpringCloud游戏商城'、'桶装水配送系统'、'社区养老小程序'、'茶文化APP'、'微服务Nacos'、'番茄影院'、'医院挂号' 等",
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
          description: "吴琦从零开始的编程全栈成长时间线仓库，真实收录了从 2023 至今的 8 大完整项目源码与文档：",
          subProjects: [
            {
              title: "🍅 番茄影院桌面售票与排片系统 (2023-06)",
              tech: "Java Swing, AWT, 原生 JDBC, MySQL",
              description: "可视化选座购票 + 后台排片运营桌面应用，掌握底层 JDBC 事务与座位状态防冲突一致性。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/01-萌芽与基础课设%20(2023)/2023-06-番茄影院售票系统`,
            },
            {
              title: "🏥 医院在线预约挂号调度系统 (2023-11)",
              tech: "JSP, Servlet, JavaBean, 原生 JDBC, Tomcat",
              description: "卓越工程师实训组长主导项目，落地全套立项书、需求规格说明书与门诊排班预约闭环。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/01-萌芽与基础课设%20(2023)/2023-11-医院预约挂号系统`,
            },
            {
              title: "🧓 社区养老志愿者互助微信小程序 (2024-03)",
              tech: "Spring Boot 2.7, Uni-app (Vue 3), 微信小程序, HikariCP",
              description: "老人端大字关怀模式 + 一键 SOS 定位报警；志愿者端推单抢单、服务打卡与爱心积分激励。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/02-实战进阶与小程序%20(2024)/2024-03-社区养老志愿者微信小程序`,
            },
            {
              title: "🍵 茶文化主题 APP 与管理中台 (2024-06)",
              tech: "Spring Boot, Vue 3 PC端, Uni-app 移动端跨端, MyBatis-Plus",
              description: "茶文化科普百科 + 茶品在线商城 + 茶友动态交流社群，三位一体垂直全栈电商。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/02-实战进阶与小程序%20(2024)/2024-06-茶文化主题APP与管理中台`,
            },
            {
              title: "🐱 宠物管理与社交分享系统 (2024-10)",
              tech: "Spring Boot, 原生微信小程序, MyBatis, MySQL",
              description: "流浪动物救助领养审核 + 宠物用品商城 + 宠友发帖互动交流闭环。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/02-实战进阶与小程序%20(2024)/2024-10-宠物管理与社交分享系统`,
            },
            {
              title: "🎮 基于 SpringCloud 的分布式游戏商城系统 (2025-06)",
              tech: "Spring Cloud Alibaba, Nacos, OpenFeign, MyBatis-Plus",
              description: "shop-parent 父工程管版本 -> common-api 抽契约/Feign -> shop-service (9008) 业务中台 -> shop-web (8008) 聚合层；Nacos 动态注册与 OpenFeign 统一熔断降级。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/03-企业级架构与微服务%20(2025)/2025-基于SpringCloud的游戏商城`,
            },
            {
              title: "💧 桶装水配送全流程数字化管理系统 (2025-09) 【吴琦最拿手的代表作】",
              tech: "Spring Boot 3.1.5 (Java 17), Vue 3, Vite, Element Plus, H5移动端",
              description: "独创空桶资产闭环模型（水票/水体与空桶分离 + 专项押金），打通「订水 → 派工 → 抢单 → 验桶签收 → 财务结算」五大链路。",
              link: `https://github.com/${githubUser}/my-programming-journey/tree/main/03-企业级架构与微服务%20(2025)/2025-09-桶装水配送管理系统`,
            },
            {
              title: "🤖 my-avatar-agent 个人 AI 数字分身 (2025 至今)",
              tech: "TypeScript, Express, DeepSeek, Tool Calling, SSE",
              description: "自主意图理解 + 工具调用循环（调取 GitHub 仓库、发放简历），首字响应低于 300ms，Token 级别安全预算熔断。",
              link: `https://github.com/${githubUser}/my-avatar-agent`,
            },
          ],
        },
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
