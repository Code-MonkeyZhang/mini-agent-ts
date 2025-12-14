import { Command } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadConfig, getDefaultConfigPath } from "./config.js";

// ============ 工具函数 ============

function getProjectVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.resolve(here, "..", "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      version?: unknown;
    };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printBanner(): void {
  const BOX_WIDTH = 58;
  const bannerText = "🤖 Mini Agent - Multi-turn Interactive Session";

  const bannerWidth = bannerText.length;
  const totalPadding = BOX_WIDTH - bannerWidth;
  const leftPaddingCount = Math.floor(totalPadding / 2);
  const rightPaddingCount = totalPadding - leftPaddingCount;

  const leftPadding = " ".repeat(Math.max(0, leftPaddingCount));
  const rightPadding = " ".repeat(Math.max(0, rightPaddingCount));
  const horizontalLine = "═".repeat(BOX_WIDTH);

  console.log();
  console.log(`╔${horizontalLine}╗`);
  console.log(`║${leftPadding}${bannerText}${rightPadding}║`);
  console.log(`╚${horizontalLine}╝`);
  console.log();
}

function parseArgs(): { workspace: string | undefined } {
  const program = new Command();

  program
    .description("Mini Agent - AI assistant with file tools and MCP support")
    .version(getProjectVersion(), "-v, --version")
    .addHelpText(
      "after",
      `
Examples:
  mini-agent-ts                              # Use current directory as workspace
  mini-agent-ts --workspace /path/to/dir     # Use specific workspace directory
      `
    );

  program.option(
    "-w, --workspace <dir>",
    "Workspace directory (default: current directory)"
  );

  program.parse(process.argv);
  const options = program.opts();

  return {
    workspace: options["workspace"] as string | undefined,
  };
}

// ============ 核心启动逻辑 ============

async function runAgent(workspaceDir: string): Promise<void> {
  console.log(`Agent starting in: ${workspaceDir}`);

  // TODO: 加载配置文件
  const configPath = getDefaultConfigPath();
  const config = loadConfig(configPath);
  console.log(`Config loaded from: ${configPath}`);
  console.log(`Model: ${config.model}, Provider: ${config.provider},`);

  // TODO: 初始化 LLM Client
  // TODO: 初始化工具
  // TODO: 加载 system prompt
  // TODO: 把 skill 加载到 system prompt
  // TODO: 创建 Agent 类
  // TODO: 打印欢迎信息
  // TODO: 配置 readline 的输入
  // TODO: 正式开启 agent 交互主循环
  // TODO: 清理 MCP 连接
}

function resolveWorkspace(args: { workspace: string | undefined }): string {
  let workspaceDir: string;

  if (args.workspace) {
    workspaceDir = path.resolve(args.workspace);
  } else {
    workspaceDir = process.cwd();
  }

  // 确保 workspace 目录存在
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  return workspaceDir;
}

// ============ 导出的入口函数 ============

export async function run(): Promise<void> {
  const args = parseArgs();

  let workspaceDir: string;
  try {
    workspaceDir = resolveWorkspace(args);
    console.log(`\nWorkspace initialized at: ${workspaceDir}`);
  } catch (error) {
    console.error(`❌ Error creating workspace directory: ${error}`);
    process.exit(1);
  }

  printBanner();
  await runAgent(workspaceDir);
}
