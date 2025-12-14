import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";
import { fileURLToPath } from "node:url";

// ============ 类型定义 ============

export interface Config {
  apiKey: string;
  apiBase: string;
  model: string;
  provider: "anthropic" | "openai";
  workspaceDir: string;
  systemPromptPath: string;
}

// ============ 配置加载 ============

/** 获取默认配置文件路径 (package/config/config.yaml) */
export function getDefaultConfigPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "config", "config.yaml");
}

/** 从 YAML 文件加载配置 */
export function loadConfig(configPath: string): Config {
  const content = fs.readFileSync(configPath, "utf8");
  const raw = yaml.parse(content) as Record<string, unknown>;

  return {
    apiKey: raw["api_key"] as string,
    apiBase: raw["api_base"] as string,
    model: raw["model"] as string,
    provider: raw["provider"] as "anthropic" | "openai",
    workspaceDir: raw["workspace_dir"] as string,
    systemPromptPath: raw["system_prompt_path"] as string,
  };
}
