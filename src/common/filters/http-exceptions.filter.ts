import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import logger from '@/lib/logger.js';
import { Request, Response } from 'express';
import { AppError } from '@errors/app.error.js';

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

    logger.error({
      message: (exception as any).message,
      stack: (exception as any).stack || 'No stack trace',
      name: (exception as any).name,
      method: request.method,
      url: request.originalUrl,
      body: request.body,
      params: request.params,
      query: request.query,
    });

    response.status(status).json({ message });
  }
}
