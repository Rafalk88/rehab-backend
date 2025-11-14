import winstonLogger from './winston.js';
import { Injectable, LoggerService as NestLogger } from '@nestjs/common';

/**
 * Safely serializes a value to a string for logging purposes.
 * - Converts non-string values using JSON.stringify
 * - Handles errors from circular structures
 * - Replaces unsupported values (functions, undefined) with safe placeholders
 */
function safeStringify(obj: unknown): string {
  try {
    return typeof obj === 'string'
      ? obj
      : JSON.stringify(obj, (_k, v) => {
          if (typeof v === 'function') return `[Function:${v.name || 'anonymous'}]`;
          return v;
        });
  } catch {
    return '[Unserializable object]';
  }
}

/**
 * Extracts a human-readable message from any thrown value.
 * - Uses `message` for Error instances
 * - Uses `.message` property when available on objects
 * - Falls back to safe JSON serialization
 * - Guarantees that Winston receives a string as the log message
 */
function extractMessage(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof Error) return input.message || input.name || 'Error';
  if (input && typeof input === 'object' && 'message' in input && typeof (input as any)) {
    return (input as any).message;
  }

  return safeStringify(input);
}

/**
 * LoggerService
 *
 * Wraps Winston logger into NestJS LoggerService interface.
 * This allows using it with NestJS DI and global logging system.
 */
@Injectable()
export class LoggerService implements NestLogger {
  log(message: unknown, context?: string) {
    const msg = extractMessage(message);
    const meta = typeof message === 'string' ? undefined : { payload: message };
    winstonLogger.info(msg, { ...meta, context });
  }

  error(message: unknown, trace?: string, context?: string) {
    const msg = extractMessage(message);
    const meta: Record<string, unknown> = { context };
    if (message instanceof Error) {
      meta.error = {
        name: message.name,
        message: message.message,
        stack: message.stack,
      };
    } else {
      meta.payload = message;
    }
    winstonLogger.error(msg, { meta });
  }

  warn(message: unknown, context?: string) {
    const msg = extractMessage(message);
    const meta = typeof message === 'string' ? undefined : { payload: message };
    winstonLogger.warn(msg, { ...meta, context });
  }

  debug(message: unknown, context?: string) {
    const msg = extractMessage(message);
    const meta = typeof message === 'string' ? undefined : { payload: message };
    winstonLogger.debug(msg, { ...meta, context });
  }

  verbose(message: unknown, context?: string) {
    const msg = extractMessage(message);
    const meta = typeof message === 'string' ? undefined : { payload: message };
    winstonLogger.verbose(msg, { ...meta, context });
  }
}
