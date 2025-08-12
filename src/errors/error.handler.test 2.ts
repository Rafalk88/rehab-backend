import { errorHandler } from '@errors/error.handler';
import { AppError } from '@errors/app.error';
import logger from '@config/logger';
import type { Request, Response, NextFunction } from 'express';

jest.mock('@config/logger', () => ({
  error: jest.fn(),
}));

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/test',
      body: { foo: 'bar' },
      params: { id: '123' },
      query: { search: 'abc' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should handle AppError and return correct status and message', () => {
    const error = new AppError('unauthorized', 'Brak dostępu');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Brak dostępu' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Brak dostępu',
        name: 'AppError',
        method: 'GET',
        url: '/test',
      }),
    );
  });

  it('should handle the usual Error and return status 500 and a default message', () => {
    const error = new Error('Błąd serwera');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Oops! Something went wrong...',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Błąd serwera',
        name: 'Error',
      }),
    );
  });
});
