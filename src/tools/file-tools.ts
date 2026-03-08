import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { tool } from 'ai';
import { z } from 'zod';

function resolvePath(workspaceDir: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(workspaceDir, targetPath);
}

function truncateTextByTokens(text: string, maxTokens: number): string {
  if (!text) {
    return text;
  }

  const estimatedTokens = Math.max(1, Math.ceil(text.length / 4));
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = estimatedTokens / text.length;
  const charsPerHalf = Math.max(1, Math.floor((maxTokens / 2 / ratio) * 0.95));

  let headPart = text.slice(0, charsPerHalf);
  const lastNewlineHead = headPart.lastIndexOf('\n');
  if (lastNewlineHead > 0) {
    headPart = headPart.slice(0, lastNewlineHead);
  }

  let tailPart = text.slice(-charsPerHalf);
  const firstNewlineTail = tailPart.indexOf('\n');
  if (firstNewlineTail > 0) {
    tailPart = tailPart.slice(firstNewlineTail + 1);
  }

  const truncationNote = `\n\n... [Content truncated: ~${estimatedTokens} tokens -> ~${maxTokens} tokens limit] ...\n\n`;
  return headPart + truncationNote + tailPart;
}

export function createFileTools(workspaceDir: string) {
  const readFileTool = tool({
    description:
      'Read file contents from the filesystem. Output always includes line numbers in format LINE_NUMBER|LINE_CONTENT (1-indexed). Supports reading partial content by specifying line offset and limit for large files.',
    inputSchema: z.object({
      path: z.string().describe('Absolute or relative path to the file'),
      offset: z
        .number()
        .optional()
        .describe(
          'Starting line number (1-indexed). Use for large files to read from specific line'
        ),
      limit: z
        .number()
        .optional()
        .describe(
          'Number of lines to read. Use with offset for large files to read in chunks'
        ),
    }),
    execute: async ({ path: filePath, offset, limit }) => {
      const targetPath = resolvePath(workspaceDir, filePath);
      try {
        await fs.access(targetPath);
      } catch {
        return `Error: File not found: ${filePath}`;
      }

      try {
        const raw = await fs.readFile(targetPath, 'utf8');
        const lines = raw.split('\n');

        const offsetVal =
          typeof offset === 'number' && Number.isFinite(offset)
            ? Math.floor(offset)
            : undefined;
        const limitVal =
          typeof limit === 'number' && Number.isFinite(limit)
            ? Math.floor(limit)
            : undefined;

        let start = offsetVal ? offsetVal - 1 : 0;
        let end = limitVal ? start + limitVal : lines.length;
        if (start < 0) start = 0;
        if (end > lines.length) end = lines.length;

        const selected = lines.slice(start, end);
        const numberedLines = selected.map((line, index) => {
          const lineNumber = String(start + index + 1).padStart(6, ' ');
          return `${lineNumber}|${line}`;
        });

        const content = truncateTextByTokens(numberedLines.join('\n'), 32000);
        return content;
      } catch (error) {
        return `Error: ${(error as Error).message || String(error)}`;
      }
    },
  });

  const writeFileTool = tool({
    description:
      'Write content to a file. Will overwrite existing files completely. For existing files, you should read the file first using read_file. Prefer editing existing files over creating new ones unless explicitly needed.',
    inputSchema: z.object({
      path: z.string().describe('Absolute or relative path to the file'),
      content: z
        .string()
        .describe('Complete content to write (will replace existing content)'),
    }),
    execute: async ({ path: filePath, content }) => {
      const targetPath = resolvePath(workspaceDir, filePath);
      try {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content ?? '', 'utf8');
        return `Successfully wrote to ${targetPath}`;
      } catch (error) {
        return `Error: ${(error as Error).message || String(error)}`;
      }
    },
  });

  const editFileTool = tool({
    description:
      'Perform exact string replacement in a file. The old_str must match exactly and appear uniquely in the file, otherwise the operation will fail. You must read the file first before editing. Preserve exact indentation from the source.',
    inputSchema: z.object({
      path: z.string().describe('Absolute or relative path to the file'),
      old_str: z
        .string()
        .describe('Exact string to find and replace (must be unique in file)'),
      new_str: z
        .string()
        .describe('Replacement string (use for refactoring, renaming, etc.)'),
    }),
    execute: async ({ path: filePath, old_str, new_str }) => {
      const targetPath = resolvePath(workspaceDir, filePath);
      try {
        await fs.access(targetPath);
      } catch {
        return `Error: File not found: ${filePath}`;
      }

      try {
        const content = await fs.readFile(targetPath, 'utf8');

        if (!content.includes(old_str)) {
          return `Error: Text not found in file: ${old_str}`;
        }

        const newContent = content.split(old_str).join(new_str);
        await fs.writeFile(targetPath, newContent, 'utf8');

        return `Successfully edited ${targetPath}`;
      } catch (error) {
        return `Error: ${(error as Error).message || String(error)}`;
      }
    },
  });

  return {
    read_file: readFileTool,
    write_file: writeFileTool,
    edit_file: editFileTool,
  };
}
