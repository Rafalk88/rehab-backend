import { authentication } from './authentication.middleware';
import { verifyToken } from '@/utils/jwt.util';
import { AppError } from '@errors/app.error';

jest.mock('@utils/jwt.util');

describe('authentication middleware', () => {
  const _next = jest.fn();

  beforeEach(() => {
    _next.mockClear();
    (verifyToken as jest.Mock).mockReset();
  });

  it('should allow OPTIONS requests without auth', () => {
    const req = { method: 'OPTIONS', headers: {} } as any;
    const res = { send: jest.fn() } as any;

    authentication(req, res, _next);

    expect(res.send).toHaveBeenCalledWith({ message: 'Preflight check successful.' });
    expect(_next).not.toHaveBeenCalled();
  });

  it('should throw error if no Authorization header', () => {
    const req = { method: 'POST', headers: {} } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    const err = _next.mock.calls[0][0];
    expect(err.message).toContain('Authorization');
  });

  it('should throw error if Authorization does not start with Bearer', () => {
    const req = { method: 'POST', headers: { authorization: 'Basic token' } } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should call next with error if token is invalid', () => {
    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid');
    });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer invalid_token' },
    } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(_next).toHaveBeenCalledWith(expect.any(AppError));
    expect(_next.mock.calls[0][0].message).toContain('Invalid access token');
  });

  it('should set session.userId and call next for valid token', () => {
    (verifyToken as jest.Mock).mockReturnValue('user-123');
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid_token' },
    } as any;
    const res = {} as any;

    authentication(req, res, _next);

    expect(req.session.userId).toBe('user-123');
    expect(_next).toHaveBeenCalledWith();
  });
});
