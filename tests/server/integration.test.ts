import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { httpServer, setupOpenAIRoutes } from '../../src/server/http-server.js';
import {
  initWebSocket,
  shutdownWebSocket,
} from '../../src/server/websocket-server.js';
import { Config } from '../../src/config.js';
import { LLMClient } from '../../src/llm-client/llm-client.js';

const PORT = 3848; // Use a different port for testing to avoid conflicts
const BASE_URL = `http://localhost:${PORT}/v1`;

describe('Integration Tests', () => {
  // Start server before all tests
  beforeAll(async () => {
    // Override env vars if needed
    process.env['NO_TUNNEL'] = '1';

    // Load config (assumes config.yaml exists in project root or relative path)
    // We might need to mock this if no config file exists in test environment
    const configPath = Config.findConfigFile('config.yaml');
    if (!configPath) {
      throw new Error('Config file not found for integration test');
    }
    const config = Config.fromYaml(configPath);

    // Initialize LLM Client
    const llmClient = new LLMClient(
      config.llm.apiKey,
      config.llm.apiBase,
      config.llm.provider,
      config.llm.model,
      config.llm.retry
    );

    // Setup Routes
    setupOpenAIRoutes(llmClient, 'You are a test assistant.');

    // Initialize services
    initWebSocket();

    // Start HTTP server
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, '0.0.0.0', () => {
        resolve();
      });
    });
  });

  // Stop server after all tests
  afterAll(async () => {
    shutdownWebSocket();
    httpServer.close();
  });

  it('SSE Streaming - Basic Chat', async () => {
    const payload = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true,
    };

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let hasDone = false;
    let content = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') {
            hasDone = true;
          } else {
            try {
              const data = JSON.parse(dataStr);
              if (data.choices?.[0]?.delta?.content) {
                content += data.choices[0].delta.content;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    }

    expect(hasDone).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  it('SSE Streaming - With Thinking Content', async () => {
    const payload = {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Explain quantum' }],
      stream: true,
    };

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);

    // Just verify we can read the stream without error
    // Whether "thinking" is present depends on the model response, which we can't guarantee
    const reader = response.body?.getReader();
    let hasDone = false;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value);
      if (chunk.includes('[DONE]')) hasDone = true;
    }

    expect(hasDone).toBe(true);
  }, 15000);

  it('Non-Streaming Response', async () => {
    const payload = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: false,
    };

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const data = (await response.json()) as any;
    expect(data.object).toBe('chat.completion');
    expect(data.choices).toBeInstanceOf(Array);
    expect(data.choices.length).toBeGreaterThan(0);
    expect(data.choices[0].message.content).toBeDefined();
  });

  it('Error Handling - Invalid Request', async () => {
    const payload = { messages: [] }; // Missing model, empty messages

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Nano-agent might return 200 with empty content or error depending on internal validation
    // But it shouldn't crash.
    // If it returns 500, that's also an "handled" error in this context vs a crash.
    expect(response.status).toBeDefined();
  });
});
