import { jest } from '@jest/globals';
import { ArgumentsHost, HttpException } from '@nestjs/common';
import { AppError } from '#common/errors/app.error.js';

await jest.unstable_mockModule('#lib/logger/winston.js', () => ({
  default: { error: jest.fn() },
}));

const logger = (await import('#lib/logger/winston.js')).default;
const { HttpExceptionFilter } = await import('./http-exceptions.filter.js');

describe('HttpExceptionFilter', () => {
  let filter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      body: { foo: 'bar' },
      params: { id: '123' },
      query: { search: 'abc' },
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getClass: () => HttpExceptionFilter,
      getHandler: () => () => {},
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle AppError correctly', () => {
    const exception = new AppError('unauthorized', 'User is not authenticated');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User is not authenticated' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User is not authenticated',
        name: 'AppError',
        method: 'GET',
        url: '/test',
      }),
    );
  });

  it('should handle HttpException correctly', () => {
    const exception = new HttpException('Forbidden', 403);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Forbidden',
        name: 'HttpException',
        method: 'GET',
        url: '/test',
      }),
    );
  });

  it('should handle unknown exception correctly', () => {
    const exception = new Error('Unexpected failure');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Oops! Something went wrong...' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unexpected failure',
        name: 'Error',
        method: 'GET',
        url: '/test',
      }),
    );
  });
});
