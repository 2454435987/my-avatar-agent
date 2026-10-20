import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const USAGE_FILE = path.join(DATA_DIR, "usage.json");

interface UsageRecord {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostRMB: number;
  dailyCostRMB: { [dateStr: string]: number };
}

export class CostGuard {
  // DeepSeek-V3 定价 (输入: 2元/百万tokens, 输出: 8元/百万tokens，缓存命中更低)
  // 这里按标准无缓存价格上浮估算，确保绝对安全
  private static PRICE_INPUT_PER_M = 2.0; // 每 100 万输入 token 2元
  private static PRICE_OUTPUT_PER_M = 8.0; // 每 100 万输出 token 8元

  // 从环境变量读取预算限额（默认总预算 2.0 元，单日预算 0.5 元）
  private static MAX_TOTAL_BUDGET = parseFloat(process.env.MAX_TOTAL_BUDGET_RMB || "2.0");
  private static MAX_DAILY_BUDGET = parseFloat(process.env.MAX_DAILY_BUDGET_RMB || "0.5");

  private static loadUsage(): UsageRecord {
    if (fs.existsSync(USAGE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
      } catch (e) {}
    }
    return {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCostRMB: 0,
      dailyCostRMB: {},
    };
  }

  private static saveUsage(usage: UsageRecord) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), "utf-8");
  }

  // 1. 检查是否超出预算限额
  public static isBudgetExceeded(): { exceeded: boolean; reason?: string } {
    const usage = this.loadUsage();
    const today = new Date().toISOString().slice(0, 10);
    const todayCost = usage.dailyCostRMB[today] || 0;

    if (usage.totalCostRMB >= this.MAX_TOTAL_BUDGET) {
      return {
        exceeded: true,
        reason: `已达到总预算上限 (¥${this.MAX_TOTAL_BUDGET.toFixed(2)})，当前累计消费 ¥${usage.totalCostRMB.toFixed(4)}。`,
      };
    }

    if (todayCost >= this.MAX_DAILY_BUDGET) {
      return {
        exceeded: true,
        reason: `今日消费已达上限 (¥${this.MAX_DAILY_BUDGET.toFixed(2)})，今日已消耗 ¥${todayCost.toFixed(4)}。`,
      };
    }

    return { exceeded: false };
  }

  // 2. 累加本次对话的 token 消耗与人民币花费
  public static recordUsage(promptTokens: number, completionTokens: number) {
    const usage = this.loadUsage();
    const cost =
      (promptTokens / 1_000_000) * this.PRICE_INPUT_PER_M +
      (completionTokens / 1_000_000) * this.PRICE_OUTPUT_PER_M;

    const today = new Date().toISOString().slice(0, 10);

    usage.totalPromptTokens += promptTokens;
    usage.totalCompletionTokens += completionTokens;
    usage.totalCostRMB += cost;
    usage.dailyCostRMB[today] = (usage.dailyCostRMB[today] || 0) + cost;

    this.saveUsage(usage);
    console.log(
      `[用量统计] 本次消耗 Tokens: ${promptTokens + completionTokens} | 产生费用: ¥${cost.toFixed(5)} | 累计总花费: ¥${usage.totalCostRMB.toFixed(4)}`
    );
  }

  // 3. 获取当前统计信息
  public static getStats() {
    const usage = this.loadUsage();
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalTokens: usage.totalPromptTokens + usage.totalCompletionTokens,
      totalCostRMB: `¥${usage.totalCostRMB.toFixed(4)}`,
      todayCostRMB: `¥${(usage.dailyCostRMB[today] || 0).toFixed(4)}`,
      maxTotalBudget: `¥${this.MAX_TOTAL_BUDGET.toFixed(2)}`,
      maxDailyBudget: `¥${this.MAX_DAILY_BUDGET.toFixed(2)}`,
    };
  }
}
