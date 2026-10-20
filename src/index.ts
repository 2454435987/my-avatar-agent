import * as readline from "readline";
    import { PersonalAgent } from "./agent.js";

    const agent = new PersonalAgent();
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("==========================================");
    console.log(" 🤖 你的个人数字分身已启动！");
    console.log(" 输入你想问的问题（输入 'exit' 或按 Ctrl+C 退出）");
    console.log("==========================================\n");

    function ask() {
      rl.question("你 > ", async (input) => {
        const trimmed = input.trim();
        if (!trimmed) {
          ask();
          return;
        }
        if (trimmed.toLowerCase() === "exit") {
          console.log("再见！");
          rl.close();
          return;
        }

        process.stdout.write("分身思考中...\r");
        const reply = await agent.chat(trimmed);
        console.log(`\n分身 > ${reply}\n`);
        ask();
      });
    }

    ask();