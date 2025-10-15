import { AppError } from '#common/errors/app.error.js';
import logger from '#lib/logger/winston.js';
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * HttpExceptionFilter
 *
 * A global NestJS exception filter that handles all unhandled exceptions
 * thrown during HTTP request processing.
 *
 * Responsibilities:
 * - Captures both `AppError` (custom application errors) and standard `HttpException` errors.
 * - Determines the appropriate HTTP status code:
 *   - Uses `AppError.statusCode` if available.
 *   - Uses `HttpException.getStatus()` for NestJS exceptions.
 *   - Defaults to `500` for unexpected errors.
 * - Determines the response message based on the error type.
 * - Logs detailed error information (message, stack trace, request data) via the application logger.
 * - Sends a JSON error response to the client with the status code and message.
 *
 * This filter ensures consistent error handling and logging across the application.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof AppError
        ? exception.statusCode
        : exception instanceof HttpException
          ? exception.getStatus()
          : 500;

    const message =
      exception instanceof AppError
        ? exception.message
        : exception instanceof HttpException
          ? exception.message
          : 'Oops! Something went wrong...';

    const safeBody = { ...request.body };
    if ('password' in safeBody) safeBody.password = '[REDACTED]';

    logger.error({
      message: (exception as any).message,
      stack: (exception as any).stack || 'No stack trace',
      name: (exception as any).name,
      method: request.method,
      url: request.originalUrl,
      body: safeBody,
      params: request.params,
      query: request.query,
    });

    response.status(status).json({ message });
  }
}
