// ============================================================
// JSON Schema 类型定义
// ============================================================

/**
 * JSON Schema 类型
 * 用于定义 Tool 的参数结构，遵循 JSON Schema 规范
 * 例如: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Tool 输入参数的基础类型
 * 所有 Tool 的 execute() 方法接收的参数都应该符合这个类型
 */
export type ToolInput = Record<string, unknown>;

// ============================================================
// Tool 执行结果
// ============================================================

/**
 * Tool 执行结果的统一结构
 * 所有 Tool 的 execute() 方法都必须返回符合此结构的对象
 *
 * @property success - 执行是否成功
 * @property content - 执行结果内容（成功时的输出文本）
 * @property error   - 错误信息（失败时的错误描述，可选）
 */
export interface ToolResult {
  success: boolean;
  content: string;
  error?: string | null;
}

/**
 * 带元数据的 Tool 结果（扩展版）
 * 用于需要返回额外字段的 Tool（如 BashTool 需要返回 stdout/stderr/exitCode）
 *
 * @template TMeta - 额外元数据的类型，必须是 Record<string, unknown> 的子类型
 *
 * @example
 * // 定义 Bash 工具的返回类型
 * type BashResult = ToolResultWithMeta<{
 *   stdout: string;
 *   stderr: string;
 *   exitCode: number;
 *   bashId?: string;
 * }>;
 */
export type ToolResultWithMeta<
  TMeta extends Record<string, unknown> = Record<string, never>
> = ToolResult & TMeta;

// ============================================================
// Tool 接口定义
// ============================================================

/**
 * Tool 接口 - 所有工具必须实现的核心接口
 *
 * @template Input  - 该 Tool 接受的输入参数类型
 * @template Output - 该 Tool 返回的结果类型（必须是 ToolResult 的子类型）
 *
 * @property name        - 工具名称，LLM 调用时使用此名称
 * @property description - 工具描述，告诉 LLM 这个工具的用途和使用方法
 * @property parameters  - JSON Schema 格式的参数定义，LLM 根据此生成正确的参数
 * @method execute       - 异步执行方法，接收参数并返回执行结果
 *
 * @example
 * class ReadFileTool implements Tool<{ path: string }, ToolResult> {
 *   name = "read_file";
 *   description = "Read file contents";
 *   parameters = { type: "object", properties: { path: { type: "string" } }, required: ["path"] };
 *   async execute({ path }) { ... }
 * }
 */
export interface Tool<
  Input extends ToolInput = ToolInput,
  Output extends ToolResult = ToolResult
> {
  name: string;
  description: string;
  parameters: JsonSchema;
  execute(params: Input): Promise<Output>;
}

// ============================================================
// LLM Provider 的 Tool Schema 格式
// ============================================================

/**
 * Anthropic (Claude) API 的 Tool Schema 格式
 * 用于将 Tool 转换为 Anthropic API 需要的格式
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export interface AnthropicToolSchema {
  name: string;
  description: string;
  input_schema: JsonSchema; // Anthropic 使用 input_schema 而非 parameters
}

/**
 * OpenAI API 的 Tool Schema 格式
 * 用于将 Tool 转换为 OpenAI API 需要的格式
 *
 * @see https://platform.openai.com/docs/guides/function-calling
 */
export interface OpenAIToolSchema {
  type: "function"; // OpenAI 要求必须指定 type 为 "function"
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
}

// ============================================================
// Schema 转换函数
// ============================================================

/**
 * 将通用 Tool 转换为 Anthropic API 格式
 *
 * @param tool - 通用 Tool 对象
 * @returns Anthropic API 所需的 tool schema
 */
export function toAnthropicSchema(tool: Tool): AnthropicToolSchema {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

/**
 * 将通用 Tool 转换为 OpenAI API 格式
 *
 * @param tool - 通用 Tool 对象
 * @returns OpenAI API 所需的 tool schema
 */
export function toOpenAISchema(tool: Tool): OpenAIToolSchema {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}
