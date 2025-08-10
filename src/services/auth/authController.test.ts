import { authController } from './authController';
import { authService } from '@services/auth/authService';

jest.mock('@services/auth/authService');

describe('authController.registerUser', () => {
  const mockRequest = (body = {}) =>
    ({
      body,
    } as any);

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should respond with 201 and user data on success', async () => {
    const req = mockRequest({
      firstName: 'John',
      surname: 'Doe',
      password: 'ValidPassword1!',
    });
    const res = mockResponse();

    (authService.registerUser as jest.Mock).mockResolvedValue({
      user: { id: 'user-uuid' },
      login: 'jdoe',
    });

    await authController.registerUser(req, res, mockNext);

    expect(authService.registerUser).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User created',
      userId: 'user-uuid',
      login: 'jdoe',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with error on failure', async () => {
    const req = mockRequest({
      firstName: 'John',
      surname: 'Doe',
      password: 'ValidPassword1!',
    });
    const res = mockResponse();

    const error = new Error('fail');
    (authService.registerUser as jest.Mock).mockRejectedValue(error);

    await authController.registerUser(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
