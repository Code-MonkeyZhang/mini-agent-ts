import * as path from 'node:path';
import * as fs from 'node:fs';
import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { Config } from './config.js';
import { createModel } from './llm/factory.js';
import { Logger } from './util/logger.js';
import { Agent } from './agent.js';
import {
  createBashTools,
  createFileTools,
  cleanupMcpConnections,
  loadMcpToolsAsync,
  setMcpTimeoutConfig,
} from './tools/index.js';

// ============ Utilities ============

function getProjectVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.resolve(here, '..', 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      version?: unknown;
    };
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Find the project root directory by searching for package.json.
 * Starts from the current file location and searches upward.
 *
 * @returns The absolute path to the project root directory
 * @throws Error if package.json cannot be found
 */
function findProjectRoot(): string {
  let currentDir = path.dirname(fileURLToPath(import.meta.url));

  while (true) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    const parentDir = path.resolve(currentDir, '..');
    if (parentDir === currentDir) {
      throw new Error('Cannot find project root (package.json not found)');
    }
    currentDir = parentDir;
  }
}

/**
 * Find skills directory with fallback mechanism.
 *
 * Search order:
 * 1. Config-specified directory
 * 2. Package installation directory
 *
 * @param skillsDirConfig - The skillsDir from config (default: './skills')
 * @returns The absolute path to skills directory
 */
function findSkillsDir(skillsDirConfig: string): string {
  const cwdSkillsDir = path.resolve(skillsDirConfig);
  if (fs.existsSync(cwdSkillsDir)) {
    return cwdSkillsDir;
  }

  const projectRoot = findProjectRoot();
  const packageSkillsDir = path.join(projectRoot, 'skills');

  if (fs.existsSync(packageSkillsDir)) {
    console.log(`📦 Using built-in skills from: ${packageSkillsDir}`);
    return packageSkillsDir;
  }

  return cwdSkillsDir;
}

function printBanner(): void {
  const BOX_WIDTH = 58;
  const bannerText = '🤖 Mini Agent TS - Multi-turn Interactive Session';

  const bannerWidth = bannerText.length;
  const totalPadding = BOX_WIDTH - bannerWidth;
  const leftPaddingCount = Math.floor(totalPadding / 2);
  const rightPaddingCount = totalPadding - leftPaddingCount;

  const leftPadding = ' '.repeat(Math.max(0, leftPaddingCount));
  const rightPadding = ' '.repeat(Math.max(0, rightPaddingCount));
  const horizontalLine = '═'.repeat(BOX_WIDTH);

  console.log();
  console.log(`╔${horizontalLine}╗`);
  console.log(`║${leftPadding}${bannerText}${rightPadding}║`);
  console.log(`╚${horizontalLine}╝`);
  console.log();
}

function parseArgs(): { workspace: string | undefined } {
  const program = new Command();

  program
    .description('Mini Agent TS - AI assistant with file tools and MCP support')
    .version(getProjectVersion(), '-v, --version')
    .addHelpText(
      'after',
      `
Examples:
  mini-agent-ts                              # Use current directory as workspace
  mini-agent-ts --workspace /path/to/dir     # Use specific workspace directory
      `
    );

  program.option(
    '-w, --workspace <dir>',
    'Workspace directory (default: current directory)'
  );

  program.parse(process.argv);
  const options = program.opts();

  return {
    workspace: options['workspace'] as string | undefined,
  };
}

function resolveWorkspace(args: { workspace: string | undefined }): string {
  let workspaceDir: string;

  if (args.workspace) {
    workspaceDir = path.resolve(args.workspace);
  } else {
    workspaceDir = process.cwd();
  }

  // Ensure the workspace directory exists
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  return workspaceDir;
}

// ============ Main Startup Logic ============

async function runAgent(workspaceDir: string): Promise<void> {
  // Load Workspace dir
  const configPath = Config.findConfigFile('config.yaml');
  if (!configPath) {
    console.error('❌ Configuration file not found. Please run setup.');
    process.exit(1);
  }
  const config = Config.fromYaml(configPath);
  console.log(`Config loaded from: ${configPath}`);
  console.log(`Workspace: ${workspaceDir}`);

  if (config.logging.enableLogging) {
    Logger.initialize();
  }

  printBanner();
  console.log(`Model: ${config.llm.model}`);
  console.log(`Provider: ${config.llm.provider}`);
  console.log(`Base URL: ${config.llm.apiBase}`);
  console.log(`Type 'exit' to quit\n`);

  // Create AI SDK model
  const model = createModel(
    config.llm.provider,
    {
      apiKey: config.llm.apiKey,
      baseURL: config.llm.apiBase,
    },
    config.llm.model
  );

  // Load system prompt
  let systemPrompt: string;
  const systemPromptPath = Config.findConfigFile(config.agent.systemPromptPath);
  if (systemPromptPath && fs.existsSync(systemPromptPath)) {
    systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
    console.log(`✅ Loaded system prompt`);
  } else {
    systemPrompt =
      'You are Mini Agent TS, an intelligent assistant powered by MiniMax M2 that can help users complete various tasks.';
    console.log('⚠️  System prompt not found, using default');
  }

  // Create AI SDK tools
  const fileTools = createFileTools(workspaceDir);
  const bashTools = createBashTools();
  const tools: Record<string, unknown> = {
    ...fileTools,
    ...bashTools,
  };

  // Load Skills
  console.log('Loading Claude Skills...');
  const skillsDir = findSkillsDir(config.tools.skillsDir);

  // Create directory if neither CWD nor package directory has skills
  if (!fs.existsSync(skillsDir)) {
    console.log(`⚠️  Skills directory does not exist: ${skillsDir}`);
    fs.mkdirSync(skillsDir, { recursive: true });
    console.log(`✅ Created skills directory: ${skillsDir}`);
  }

  // Load skills
  try {
    const { SkillLoader, GetSkillTool } = await import('./skills/index.js');
    const skillLoader = new SkillLoader(skillsDir);
    const discoveredSkills = skillLoader.discoverSkills();

    if (discoveredSkills.length > 0) {
      const getSkillTool = new GetSkillTool(skillLoader);

      tools['get_skill'] = {
        description: getSkillTool.description,
        inputSchema: getSkillTool.parameters as Record<string, unknown>,
        execute: async (args: Record<string, unknown>) => {
          const result = await getSkillTool.execute(args);
          return result.success ? result.content : `Error: ${result.error}`;
        },
      };

      // Inject skills metadata into system prompt
      const skillsMetadata = skillLoader.getSkillsMetadataPrompt();
      systemPrompt += `\n\n${skillsMetadata}`;

      // Log skills info
      Logger.log(
        'startup',
        'Skills Loaded:',
        discoveredSkills.map((s) => s.name)
      );
      Logger.log('startup', 'Full System Prompt:', systemPrompt);

      console.log(`✅ Loaded ${discoveredSkills.length} skill(s)`);
    } else {
      console.log('⚠️  No skills found in skills directory');
    }
  } catch (error) {
    console.error(`❌ Failed to load skills: ${error}`);
  }

  // Load MCPs
  console.log('Loading MCP tools...');
  const mcpConfig = config.tools.mcp;
  setMcpTimeoutConfig({
    connectTimeout: mcpConfig.connectTimeout,
    executeTimeout: mcpConfig.executeTimeout,
    sseReadTimeout: mcpConfig.sseReadTimeout,
  });

  const mcpConfigPath = Config.findConfigFile(config.tools.mcpConfigPath);
  if (mcpConfigPath) {
    const mcpTools = await loadMcpToolsAsync(mcpConfigPath);
    if (mcpTools.length > 0) {
      for (const tool of mcpTools) {
        tools[tool.name] = {
          description: tool.description,
          inputSchema: tool.parameters as Record<string, unknown>,
          execute: async (args: Record<string, unknown>) => {
            const result = await tool.execute(args);
            return result.success ? result.content : `Error: ${result.error}`;
          },
        };
      }
      const msg = `✅ Loaded ${mcpTools.length} MCP tools (from: ${mcpConfigPath})`;
      Logger.log('startup', msg);
    } else {
      const msg = '⚠️  No available MCP tools found';
      console.log(msg);
      Logger.log('startup', msg);
    }
  } else {
    const msg = `⚠️  MCP config file not found: ${config.tools.mcpConfigPath}`;
    console.log(msg);
    Logger.log('startup', msg);
  }

  const agent = new Agent({
    model,
    systemPrompt,
    maxSteps: config.agent.maxSteps,
    workspaceDir,
    tools,
  });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
    removeHistoryDuplicates: true,
  });
  let interrupted = false;
  const onSigint = (): void => {
    interrupted = true;
    rl.close();
  };
  process.once('SIGINT', onSigint);

  try {
    while (true) {
      let raw: string;
      try {
        raw = await rl.question('You > ');
      } catch (error) {
        if (interrupted) break;
        throw error;
      }

      const userInput = raw.trim();
      if (!userInput) continue;

      if (userInput === 'exit' || userInput === 'quit' || userInput === 'q')
        break;
      agent.addUserMessage(userInput);

      try {
        await agent.run();
      } catch (error) {
        if (error instanceof Error) {
          console.log(`\n❌ Error: ${error.message}`, error);
          console.log('   Please check your API key and configuration.\n');
        } else {
          console.log(`\n❌ Unexpected error: ${String(error)}`);
          console.log('   Please try again or report this issue.\n');
        }

        // Remove unfinished user message
        agent.messages.pop();
        continue;
      }

      console.log(`\n${'─'.repeat(60)}\n`);
    }
  } finally {
    // Graceful Shutdown
    process.removeListener('SIGINT', onSigint);
    rl.close();
    await cleanupMcpConnections();
  }
}

export async function run(): Promise<void> {
  const args = parseArgs();

  let workspaceDir: string;
  try {
    workspaceDir = resolveWorkspace(args);
  } catch (error) {
    console.error(`❌ Error creating workspace directory: ${error}`);
    process.exit(1);
  }

  await runAgent(workspaceDir);
}
