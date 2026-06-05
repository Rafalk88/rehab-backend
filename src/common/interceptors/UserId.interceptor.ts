import { RequestContextService } from '#context/request-context.service.js';
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

@Injectable()
export class UserIdInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    this.requestContext.setUserId(userId);

    return next.handle();
  }
}
