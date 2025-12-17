import * as path from "node:path";
import * as fs from "node:fs";
import { LLMClient } from "./llm/llm_wrapper.js";
import type { LLMResponse, Message } from "./schema/index.js";

// ============ 辅助函数 ============

function createSpinner(message: string = "Thinking"): { stop: () => void } {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${frames[i]} ${message}...`);
    i = (i + 1) % frames.length;
  }, 80);

  return {
    stop: () => {
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(message.length + 10) + "\r"); // 清除行
    },
  };
}

function printAssistantResponse(response: LLMResponse): void {
  console.log();

  // Print thinking if present
  if (response.thinking) {
    console.log("💭 Thinking:");
    console.log("─".repeat(60));
    console.log(response.thinking);
    console.log("─".repeat(60));
    console.log();
  }

  // Print main response
  console.log("🤖 Assistant:");
  console.log(response.content);

  // Print token usage if available
  if (response.usage) {
    console.log();
    console.log(
      `📊 Tokens: ${response.usage.prompt_tokens} in / ${response.usage.completion_tokens} out`
    );
  }
}

// ============ Agent 类 ============

export class Agent {
  public llmClient: LLMClient;
  public systemPrompt: string;
  public maxSteps: number;
  public messages: Message[];
  public tokenLimit: number;
  public workspaceDir: string;
  constructor(
    llmClient: LLMClient,
    systemPrompt: string,
    maxSteps: number = 50,
    workspaceDir: string = "./workspace",
    tokenLimit: number = 8000
  ) {
    this.llmClient = llmClient;
    this.maxSteps = maxSteps;
    this.tokenLimit = tokenLimit;

    // Ensure workspace exists
    this.workspaceDir = path.resolve(workspaceDir);
    fs.mkdirSync(this.workspaceDir, { recursive: true });

    // 将workspace dir注入system prompt 然后再加入
    if (!systemPrompt.includes("Current Workspace")) {
      const workspaceInfo =
        `\n\n## ${"Current Workspace"}` +
        `\nYou are currently working in: \`${workspaceDir}\`` +
        `\nAll relative paths will be resolved relative to this directory.`;
      systemPrompt += workspaceInfo;
    }

    this.systemPrompt = systemPrompt;
    this.messages = [{ role: "system", content: systemPrompt }]; // 填入system prompt

    //TODO 初始化Logger
    //TODO 启动TOKEN计算
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: "user", content });
  }

  clearHistoryKeepSystem(): number {
    const removed = Math.max(0, this.messages.length - 1);
    this.messages = this.messages.slice(0, 1);
    return removed;
  }

  async run(): Promise<string> {
    let step = 0;

    while (step < this.maxSteps) {
      // TODO Check and summarize message history to prevent context overflow
      // TODO 添加回复的cli界面Header

      // 启用LLM 接收回复
      let response: LLMResponse;
      const spinner = createSpinner("Thinking");

      try {
        response = await this.llmClient.generate(this.messages);
      } catch (error) {
        spinner.stop();
        //TODO API失败时的情况
        throw error;
      }

      spinner.stop();

      // 打印 LLM 回复
      printAssistantResponse(response);

      // Add assistant message
      const message: Message = {
        role: "assistant",
        content: response.content,
        thinking: response.thinking,
      };
      this.messages.push(message);
      // Check if task is complete (no tool calls)
      // Execute tool calls

      if (!response.tool_calls) {
        return response.content;
      }
      step += 1;
    }

    // Max steps reached, return error
    const errorMsg = "Task couldn't be completed after {self.max_steps} steps.";
    return errorMsg;
  }
}
