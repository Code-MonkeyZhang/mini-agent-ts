import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export class Logger {
  private static logFile: string | null = null;

  static initialize(logDir?: string) {
    const logsDir = logDir ?? this.getLogsDirectory();
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    this.logFile = path.join(logsDir, `agent-${timestamp}.log`);
    console.log(`Logging to file: ${this.logFile}`);
  }

  static getLogsDirectory(): string {
    return path.join(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'),
      'logs'
    );
  }

  static log(category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();

    let formattedData = '';
    if (data !== undefined && data !== null) {
      if (typeof data === 'string') {
        // Format string data with newlines and indentation
        formattedData = `\n${data
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')}`;
      } else {
        formattedData = JSON.stringify(data, null, 2);
      }
    }

    const fileEntry = `[${timestamp}] [${category}] ${message}${formattedData}\n`;

    // Write to file if initialized
    if (this.logFile) {
      fs.appendFileSync(this.logFile, fileEntry);
    }
  }

  static debug(category: string, message: string, data?: any) {
    this.log(category, message, data);
  }

  static logLLMRequest(request: any) {
    this.log('LLM REQUEST', 'Full Request JSON', request);
  }

  static logLLMResponse(response: any) {
    this.log('LLM RESPONSE', 'Full Response Data', response);
  }
}

export const sdkLoggerAdapter = {
  debug(message: string, ...args: unknown[]) {
    Logger.log('LLM SDK', message, args.length > 0 ? args : undefined);
  },
  info(message: string, ...args: unknown[]) {
    Logger.log('LLM SDK', message, args.length > 0 ? args : undefined);
  },
  warn(message: string, ...args: unknown[]) {
    Logger.log('LLM SDK WARN', message, args.length > 0 ? args : undefined);
  },
  error(message: string, ...args: unknown[]) {
    Logger.log('LLM SDK ERROR', message, args.length > 0 ? args : undefined);
  },
};
