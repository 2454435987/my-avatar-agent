import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.join(__dirname, "../docs");

interface DocumentChunk {
  source: string;
  section: string;
  content: string;
}

export class LocalRAG {
  private chunks: DocumentChunk[] = [];
  private isIndexing: boolean = false;

  constructor() {
    this.loadAndIndexDocs();
  }

  // 加载并对 docs 目录下的所有 markdown / txt / pdf / docx 文件进行解析与分块
  public async loadAndIndexDocs() {
    if (this.isIndexing) return;
    this.isIndexing = true;
    this.chunks = [];

    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
      this.isIndexing = false;
      return;
    }

    const files = fs.readdirSync(DOCS_DIR);
    for (const file of files) {
      const filePath = path.join(DOCS_DIR, file);
      const ext = path.extname(file).toLowerCase();

      try {
        if (ext === ".md" || ext === ".txt") {
          // 1. Markdown / 纯文本解析
          const text = fs.readFileSync(filePath, "utf-8");
          this.chunkMarkdown(file, text);
          console.log(`[RAG] 成功解析 Markdown/文本: ${file}`);
        } else if (ext === ".pdf") {
          // 2. PDF 解析（兼容 pdf-parse v2 API）
          const dataBuffer = fs.readFileSync(filePath);
          const parser = new PDFParse({ data: dataBuffer });
          const pdfData = await parser.getText();
          this.chunkPlainText(file, pdfData.text);
          console.log(`[RAG] 成功解析 PDF 简历: ${file} (提取到 ${pdfData.text.length} 字符)`);
        } else if (ext === ".docx") {
          // 3. Word 文档 (.docx) 解析
          const result = await mammoth.extractRawText({ path: filePath });
          this.chunkPlainText(file, result.value);
          console.log(`[RAG] 成功解析 Word 文档: ${file}`);
        }
      } catch (err: any) {
        console.error(`[RAG] 解析文件 ${file} 失败:`, err.message);
      }
    }
    this.isIndexing = false;
  }

  // 按 Markdown 二级标题 (##) 切分
  private chunkMarkdown(filename: string, content: string) {
    const sections = content.split(/\n(?=##\s+)/g);
    for (const sec of sections) {
      const trimmed = sec.trim();
      if (!trimmed) continue;

      const lines = trimmed.split("\n");
      const title = lines[0]?.replace(/^#+\s*/, "") || filename;

      this.chunks.push({
        source: filename,
        section: title,
        content: trimmed,
      });
    }
  }

  // 针对 PDF / Word 文本分块
  private chunkPlainText(filename: string, fullText: string) {
    // 按段落和业务块拆分
    const paragraphs = fullText.split(/\n{2,}/);
    let buffer = "";
    let chunkIndex = 1;

    for (const p of paragraphs) {
      const clean = p.replace(/\t+/g, " ").trim();
      if (!clean) continue;

      buffer += clean + "\n\n";
      // 保持每个片段 300~500 字，既有完整上下文又不过大
      if (buffer.length >= 350) {
        this.chunks.push({
          source: filename,
          section: `第 ${chunkIndex} 部分`,
          content: buffer.trim(),
        });
        buffer = "";
        chunkIndex++;
      }
    }

    if (buffer.trim()) {
      this.chunks.push({
        source: filename,
        section: `第 ${chunkIndex} 部分`,
        content: buffer.trim(),
      });
    }

    // 同时保留一份简历全文 chunk，防止零散问题跨段落找不到
    if (fullText.length < 3000) {
      this.chunks.push({
        source: filename,
        section: "完整概览",
        content: fullText.replace(/\t+/g, " ").trim(),
      });
    }
  }

  // 检索最相关的知识片段
  public async search(query: string, topK: number = 3): Promise<string> {
    if (this.chunks.length === 0) {
      await this.loadAndIndexDocs();
    }

    // 提取中文词和英文词
    const rawTokens = query
      .toLowerCase()
      .split(/[\s,，?？。！!、:：()（）]+/g)
      .filter((w) => w.length >= 1);

    // 针对中文做 n-gram 词元切分（比如 "工作职责" -> ["工作", "职责", "工作职责"]）
    const tokens = new Set<string>();
    for (const token of rawTokens) {
      tokens.add(token);
      if (token.length > 2) {
        for (let i = 0; i < token.length - 1; i++) {
          tokens.add(token.slice(i, i + 2));
        }
      }
    }

    const scored = this.chunks.map((chunk) => {
      let score = 0;
      const lower = chunk.content.toLowerCase();
      const lowerTitle = chunk.section.toLowerCase();

      for (const kw of tokens) {
        if (kw.length < 2 && !/[a-zA-Z0-9]/.test(kw)) continue; // 忽略单个无关中文字符
        if (lowerTitle.includes(kw)) score += 5;
        const matches = lower.split(kw).length - 1;
        score += matches * 2;
      }
      return { chunk, score };
    });

    const relevant = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // 如果没检索到，但库里有“完整概览”类型的 chunk，直接作为兜底参考给模型
    if (relevant.length === 0) {
      const fallback = this.chunks.find((c) => c.section === "完整概览");
      if (fallback) {
        return `[参考完整简历档案 《${fallback.source}》]:\n${fallback.content}`;
      }
      return "知识库中暂未找到与该问题紧密相关的详细记录。";
    }

    return relevant
      .map(
        (item, idx) =>
          `[参考文档片段 ${idx + 1} 来自 《${item.chunk.source}》 - ${item.chunk.section}]:\n${item.chunk.content}`
      )
      .join("\n\n---\n\n");
  }
}

export const localRAG = new LocalRAG();
