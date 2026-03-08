import { describe, it, expect } from 'vitest';
import type { ToolExecutionOptions } from 'ai';

import { createBashTools } from '../src/tools/bash-tool.js';

const options: ToolExecutionOptions = { toolCallId: 'test', messages: [] };

const describeIf = process.platform === 'win32' ? describe.skip : describe;

describeIf('Bash tool', () => {
  it('should execute foreground commands', async () => {
    const { bash } = createBashTools();
    const result = await bash.execute!(
      {
        command: "echo 'Hello from foreground'",
      },
      options
    );

    expect(result).toContain('Hello from foreground');
  });

  it('should capture stdout and stderr', async () => {
    const { bash } = createBashTools();
    const result = await bash.execute!(
      {
        command: "echo 'stdout message' && echo 'stderr message' >&2",
      },
      options
    );

    expect(result).toContain('stdout message');
    expect(result).toContain('stderr message');
  });

  it('should report command failures', async () => {
    const { bash } = createBashTools();
    const result = await bash.execute!(
      {
        command: 'ls /nonexistent_directory_12345',
      },
      options
    );

    expect(result).toContain('cannot access');
  });

  it('should handle timeouts', async () => {
    const { bash } = createBashTools();
    const result = await bash.execute!(
      { command: 'sleep 5', timeout: 1 },
      options
    );

    // Check for any indication of timeout or error
    expect(result).toMatch(/timed out|timeout|exit_code|-1/);
  }, 10000);

  it('should run background commands and fetch output', async () => {
    const { bash, bash_output, bash_kill } = createBashTools();
    const result = await bash.execute!(
      {
        command: "for i in 1 2 3; do echo 'Line '$i; sleep 0.2; done",
        run_in_background: true,
      },
      options
    );

    expect(result).toContain('bash_id');
    const bashIdMatch = result.match(/bash_id['"]?\s*[:=]\s*['"]?([a-f0-9]+)/);
    const bashId = bashIdMatch ? bashIdMatch[1] : '';
    expect(bashId).not.toBe('');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const outputResult = await bash_output.execute!(
      { bash_id: bashId },
      options
    );
    expect(outputResult).toContain('Line');

    const killResult = await bash_kill.execute!({ bash_id: bashId }, options);
    expect(killResult).toBeTruthy();
  }, 10000);

  it('should filter background output', async () => {
    const { bash, bash_output, bash_kill } = createBashTools();
    const result = await bash.execute!(
      {
        command: "for i in 1 2 3 4 5; do echo 'Line '$i; sleep 0.2; done",
        run_in_background: true,
      },
      options
    );

    const bashIdMatch = result.match(/bash_id['"]?\s*[:=]\s*['"]?([a-f0-9]+)/);
    const bashId = bashIdMatch ? bashIdMatch[1] : '';
    expect(bashId).not.toBe('');
    await new Promise((resolve) => setTimeout(resolve, 800));

    const outputResult = await bash_output.execute!(
      {
        bash_id: bashId,
        filter_str: 'Line [24]',
      },
      options
    );

    expect(outputResult).toMatch(/Line (2|4)/);

    await bash_kill.execute!({ bash_id: bashId }, options);
  }, 10000);

  it('should handle non-existent bash ids', async () => {
    const { bash_kill, bash_output } = createBashTools();

    // Kill should handle non-existent IDs - returns exit_code -1
    const killResult = await bash_kill.execute!(
      { bash_id: 'nonexistent123' },
      options
    );
    expect(killResult).toMatch(/not found|Shell not found|exit_code.*-1|-1/);

    // Output also returns exit_code -1 for non-existent shells
    const outputResult = await bash_output.execute!(
      {
        bash_id: 'nonexistent123',
      },
      options
    );
    expect(outputResult).toMatch(/-1/);
  });
});
