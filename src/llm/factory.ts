import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

export interface ModelOptions {
  apiKey: string;
  baseURL: string;
}

export function createModel(
  provider: 'openai' | 'anthropic',
  options: ModelOptions,
  model: string
): LanguageModel {
  const { apiKey, baseURL } = options;

  switch (provider) {
    case 'anthropic': {
      const anthropicProvider = createAnthropic({
        apiKey,
        baseURL,
      });
      return anthropicProvider(model);
    }
    case 'openai': {
      const openaiProvider = createOpenAI({
        apiKey,
        baseURL,
      });
      return openaiProvider(model);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
