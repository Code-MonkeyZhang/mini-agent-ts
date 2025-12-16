import { LLMClient } from "./llm/llm_wrapper.js";

export type AgentMessageRole = "system" | "user" | "assistant" | "tool";

export type AgentMessage = Readonly<{
  role: AgentMessageRole;
  content: string;
}>;

export class Agent {
  public llmClient: LLMClient;
  public systemPrompt: string;
  public maxSteps: number;
  public messages: AgentMessage[];
  constructor(llmClient: LLMClient, systemPrompt: string, maxSteps: number) {
    this.llmClient = llmClient;
    this.systemPrompt = systemPrompt;
    this.maxSteps = maxSteps;
    this.messages = [{ role: "system", content: systemPrompt }];
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
    const response =
      "(agent.run not implemented yet — collected your input into session history)";

    try {
      response;
    } catch (error) {}

    return response;
  }
}
