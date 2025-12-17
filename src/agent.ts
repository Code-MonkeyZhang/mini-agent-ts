import * as path from "node:path";
import * as fs from "node:fs";
import { LLMClient } from "./llm/llm_wrapper.js";
import type { LLMResponse, Message } from "./schema/index.js";

// ============ 常量 ============

const SEPARATOR_WIDTH = 60;

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
      process.stdout.write("\r" + " ".repeat(message.length + 10) + "\r");
    },
  };
}

function buildSystemPrompt(basePrompt: string, workspaceDir: string): string {
  if (basePrompt.includes("Current Workspace")) {
    return basePrompt;
  }
  return (
    basePrompt +
    `

## Current Workspace
You are currently working in: \`${workspaceDir}\`
All relative paths will be resolved relative to this directory.`
  );
}

function printAssistantResponse(response: LLMResponse): void {
  console.log();

  // Print thinking if present
  if (response.thinking) {
    console.log("💭 Thinking:");
    console.log("─".repeat(SEPARATOR_WIDTH));
    console.log(response.thinking);
    console.log("─".repeat(SEPARATOR_WIDTH));
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

    // 将 workspace dir 注入 system prompt
    this.systemPrompt = buildSystemPrompt(systemPrompt, workspaceDir);
    this.messages = [{ role: "system", content: this.systemPrompt }];

    // TODO: 初始化 Logger
    // TODO: 启动 TOKEN 计算
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: "user", content });
  }

  clearHistoryKeepSystem(): number {
    const removed = this.messages.length - 1;
    this.messages = [this.messages[0]];
    return removed;
  }

  async run(): Promise<string> {
    for (let step = 0; step < this.maxSteps; step++) {
      // TODO: Check and summarize message history to prevent context overflow

      const spinner = createSpinner("Thinking");
      let response: LLMResponse;

      try {
        response = await this.llmClient.generate(this.messages);
      } finally {
        spinner.stop();
      }

      // 打印 LLM 回复
      printAssistantResponse(response);

      // Add assistant message
      this.messages.push({
        role: "assistant",
        content: response.content,
        thinking: response.thinking,
      });

      // Check if task is complete (no tool calls)
      if (!response.tool_calls) {
        return response.content;
      }

      // TODO: Execute tool calls
    }

    return `Task couldn't be completed after ${this.maxSteps} steps.`;
  }
}
