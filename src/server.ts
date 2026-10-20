import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PersonalAgent } from "./agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静态网页托管
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

const agent = new PersonalAgent();

// 流式聊天接口
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).send("Message is required");
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = agent.chatStream(message);
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error("服务端出错:", error);
    res.write("\n[服务器内部错误]");
    res.end();
  }
});

// 重置对话
app.post("/api/reset", (req, res) => {
  agent.reset();
  res.json({ status: "ok" });
});

// 提供简历下载路由
app.get("/api/download-resume", (req, res) => {
  const resumePath = path.join(__dirname, "../docs/吴琦 全栈开发.pdf");
  if (fs.existsSync(resumePath)) {
    // 设置下载文件名
    res.download(resumePath, "吴琦-全栈开发-个人简历.pdf");
    return;
  }
  res.status(404).send("简历文件不存在");
});

// 查看访客留给你的所有留言接口
app.get("/api/messages", (req, res) => {
  const messagesFile = path.join(__dirname, "../data/messages.json");
  if (fs.existsSync(messagesFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(messagesFile, "utf-8") || "[]");
      res.json(data);
      return;
    } catch (e) {}
  }
  res.json([]);
});

app.listen(port, () => {
  console.log(`=================================================`);
  console.log(`🚀 具备 Tool Calling 能力的数字分身已上线！`);
  console.log(`👉 聊天页面: http://localhost:${port}`);
  console.log(`👉 查看访客留言: http://localhost:${port}/api/messages`);
  console.log(`=================================================`);
});
