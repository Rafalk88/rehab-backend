import { PrismaSessionMiddleware } from './prisma-session.js';
import {
  RequestContextService,
  RequestContextData,
} from '../../context/request-context.service.js';
import { Request, Response } from 'express';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'net';

describe('PrismaSessionMiddleware', () => {
  let middleware: PrismaSessionMiddleware;
  let requestContext: jest.Mocked<RequestContextService>;
  let next: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaSessionMiddleware,
        {
          provide: RequestContextService,
          useValue: {
            run: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get(PrismaSessionMiddleware);
    requestContext = module.get(RequestContextService) as jest.Mocked<RequestContextService>;
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => {
    const socketMock: Partial<Socket> = {
      remoteAddress: '10.0.0.1',
    };

    return {
      user: { id: 'user-123' } as any,
      headers: {},
      socket: socketMock as unknown as Socket,
      ...overrides,
    } as Partial<Request>;
  };

  it('✅ should call RequestContextService.run with userId and ipAddress', () => {
    const req = mockReq();
    middleware.use(req as Request, {} as Response, next);

    expect(requestContext.run).toHaveBeenCalledTimes(1);

    const call = requestContext.run.mock.calls[0];
    expect(call).toBeDefined();

    const [data] = call as [RequestContextData, () => void];
    expect(data).toEqual({ userId: 'user-123', ipAddress: '10.0.0.1' });
  });

  it('✅ should extract IP from x-forwarded-for header', () => {
    const req = mockReq({
      headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' } as any,
    });

    middleware.use(req as Request, {} as Response, next);

    const call = requestContext.run.mock.calls[0];
    const [data] = call as [RequestContextData, () => void];

    expect(data.ipAddress).toBe('192.168.1.100');
  });

  it('✅ should handle missing user gracefully', () => {
    const req = mockReq({ user: undefined });
    middleware.use(req as Request, {} as Response, next);

    const call = requestContext.run.mock.calls[0];
    const [data] = call as [RequestContextData, () => void];

    expect(data).toEqual({ userId: null, ipAddress: '10.0.0.1' });
  });

  it('✅ should call next() inside run() callback', () => {
    const req = mockReq();
    middleware.use(req as Request, {} as Response, next);

    expect(requestContext.run).toHaveBeenCalledTimes(1);
    const call = requestContext.run.mock.calls[0];
    expect(call).toBeDefined();

    const callback = (call as any)[1] as () => void;
    expect(typeof callback).toBe('function');

    callback();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('✅ should default ipAddress to "unknown" if not available', () => {
    const req = mockReq({
      socket: { remoteAddress: undefined } as unknown as Socket,
    });

    middleware.use(req as Request, {} as Response, next);

    const call = requestContext.run.mock.calls[0];
    const [data] = call as [RequestContextData, () => void];

    expect(data.ipAddress).toBe('unknown');
  });
});
