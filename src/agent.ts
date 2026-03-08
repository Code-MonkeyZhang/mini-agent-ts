import * as path from 'node:path';
import * as fs from 'node:fs';
import { ToolLoopAgent, stepCountIs } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { Colors, drawStepHeader } from './util/terminal.js';
import { Logger } from './util/logger.js';

function buildSystemPrompt(basePrompt: string, workspaceDir: string): string {
  if (basePrompt.includes('Current Workspace')) {
    return basePrompt;
  }
  return `${basePrompt}

## Current Workspace
You are currently working in: \`${workspaceDir}\`
All relative paths will be resolved relative to this directory.`;
}

export interface AgentConfig {
  model: LanguageModel;
  systemPrompt: string;
  maxSteps: number;
  workspaceDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>;
}

export class Agent {
  public model: LanguageModel;
  public systemPrompt!: string;
  public maxSteps: number;
  public workspaceDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public tools: Record<string, any>;
  public messages: ModelMessage[];

  private agent: ToolLoopAgent;
  private step = 0;

  constructor(config: AgentConfig) {
    this.model = config.model;
    this.maxSteps = config.maxSteps;
    this.workspaceDir = path.resolve(config.workspaceDir);
    this.tools = config.tools;

    fs.mkdirSync(this.workspaceDir, { recursive: true });

    const fullSystemPrompt = buildSystemPrompt(
      config.systemPrompt,
      this.workspaceDir
    );
    this.messages = [{ role: 'system', content: fullSystemPrompt }];

    this.agent = new ToolLoopAgent({
      model: this.model,
      tools: this.tools,
      instructions: fullSystemPrompt,
      stopWhen: stepCountIs(this.maxSteps),
    });
  }

  addUserMessage(content: string): void {
    Logger.log('CHAT', 'User:', content);
    this.messages.push({ role: 'user', content });
  }

  async run(): Promise<string> {
    const userMessages = this.messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (!lastUserMessage) {
      return 'No user message to process';
    }

    this.step++;
    console.log();
    console.log(drawStepHeader(this.step, this.maxSteps));

    const stream = await this.agent.stream({
      messages: this.messages,
    });

    let fullContent = '';
    let isThinkingPrinted = false;

    for await (const chunk of stream.fullStream) {
      switch (chunk.type) {
        case 'text-delta':
          if (!isThinkingPrinted && fullContent === '') {
            console.log();
            console.log(
              `${Colors.BOLD}${Colors.BRIGHT_BLUE}📝 Response:${Colors.RESET}`
            );
          }
          process.stdout.write(chunk.text);
          fullContent += chunk.text;
          break;

        case 'reasoning-delta':
          if (!isThinkingPrinted) {
            console.log();
            console.log(`${Colors.DIM}─${'─'.repeat(60)}${Colors.RESET}`);
            console.log();
            console.log(
              `${Colors.BOLD}${Colors.BRIGHT_MAGENTA}🧠 Thinking:${Colors.RESET}`
            );
            isThinkingPrinted = true;
          }
          process.stdout.write(chunk.text);
          break;

        case 'tool-call':
          const toolName = chunk.toolName;
          const args = chunk.input as Record<string, unknown>;
          console.log(
            `\n${Colors.BOLD}${Colors.BRIGHT_YELLOW}🔧 Tool: ${toolName}${Colors.RESET}`
          );
          console.log(`${Colors.DIM}   Arguments:${Colors.RESET}`);
          const truncatedArgs: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(args)) {
            const valueStr = String(value);
            if (valueStr.length > 200) {
              truncatedArgs[key] = `${valueStr.slice(0, 200)}...`;
            } else {
              truncatedArgs[key] = value;
            }
          }
          const argsJson = JSON.stringify(truncatedArgs, null, 2);
          for (const line of argsJson.split('\n')) {
            console.log(`   ${Colors.DIM}${line}${Colors.RESET}`);
          }
          break;

        case 'tool-result': {
          const resultContent = String(chunk.output ?? '');
          const MAX_LENGTH = 300;
          let resultText = resultContent;
          if (resultText.length > MAX_LENGTH) {
            resultText = `${resultText.slice(
              0,
              MAX_LENGTH
            )}${Colors.DIM}...${Colors.RESET}`;
          }
          console.log(
            `${Colors.BRIGHT_GREEN}✓${Colors.RESET} ${Colors.BOLD}${Colors.BRIGHT_GREEN}Success:${Colors.RESET} ${resultText}\n`
          );
          break;
        }

        case 'error':
          console.log(
            `${Colors.BRIGHT_RED}✗${Colors.RESET} ${Colors.BOLD}${Colors.BRIGHT_RED}Error:${Colors.RESET} ${Colors.RED}${chunk.error}${Colors.RESET}\n`
          );
          break;
      }
    }

    const response = await stream.response;
    this.messages.push(...response.messages);

    console.log();
    return fullContent;
  }
}
