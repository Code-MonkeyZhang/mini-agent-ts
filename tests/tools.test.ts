import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createFileTools } from '../src/tools/file-tools.js';
import type { ToolExecutionOptions } from 'ai';

const options: ToolExecutionOptions = { toolCallId: 'test', messages: [] };

describe('File tools', () => {
  it('should read files with line numbers', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-agent-'));
    const filePath = path.join(tempDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf8');

    const { read_file } = createFileTools(tempDir);
    const result = await read_file.execute!({ path: 'sample.txt' }, options);

    expect(result).toContain('     1|line1');
    expect(result).toContain('     2|line2');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should read files with offset and limit', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-agent-'));
    const filePath = path.join(tempDir, 'sample.txt');
    await fs.writeFile(filePath, 'a\nb\nc\nd\n', 'utf8');

    const { read_file } = createFileTools(tempDir);
    const result = await read_file.execute!(
      {
        path: 'sample.txt',
        offset: 2,
        limit: 2,
      },
      options
    );

    expect(result).toContain('     2|b');
    expect(result).toContain('     3|c');
    expect(result).not.toContain('     1|a');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should write files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-agent-'));
    const filePath = path.join(tempDir, 'write.txt');
    const { write_file } = createFileTools(tempDir);

    const result = await write_file.execute!(
      {
        path: 'write.txt',
        content: 'Test content',
      },
      options
    );

    expect(result).toContain('Successfully wrote');
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toBe('Test content');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should edit files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-agent-'));
    const filePath = path.join(tempDir, 'edit.txt');
    await fs.writeFile(filePath, 'hello world', 'utf8');
    const { edit_file } = createFileTools(tempDir);

    const result = await edit_file.execute!(
      {
        path: 'edit.txt',
        old_str: 'world',
        new_str: 'agent',
      },
      options
    );

    expect(result).toContain('Successfully edited');
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toBe('hello agent');

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
