import winstonLogger from './winston.js';
import { Injectable, LoggerService as NestLogger } from '@nestjs/common';

/**
 * LoggerService
 *
 * Wraps Winston logger into NestJS LoggerService interface.
 * This allows using it with NestJS DI and global logging system.
 */
@Injectable()
export class LoggerService implements NestLogger {
  log(message: any, context?: string) {
    winstonLogger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    winstonLogger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    winstonLogger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    winstonLogger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    winstonLogger.verbose(message, { context });
  }
}
