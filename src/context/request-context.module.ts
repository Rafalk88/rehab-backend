import { RequestContextService } from './request-context.service.js';
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule {}
