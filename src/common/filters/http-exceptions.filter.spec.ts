import { HttpException, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exceptions.filter.js';
import { AppError } from '@common/errors/app.error.js';
import logger from '@lib/logger/winston.js';

jest.mock('@lib/logger/winston.js', () => ({
  error: jest.fn(),
}));

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
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
