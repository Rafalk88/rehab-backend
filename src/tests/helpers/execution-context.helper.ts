import { ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';

export function createMockExecutionContext(req: Partial<any>): Partial<ExecutionContext> {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),

    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    getType: () => 'http',

    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getArgs: () => [],
    getArgByIndex: () => null,
  } as unknown as ExecutionContext;
}
