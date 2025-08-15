import jwt from 'jsonwebtoken';
process.env.JWT_SECRET = 'test-secret';
import { generateToken, verifyToken } from './jwt.util.js';

jest.mock('jsonwebtoken');

describe('JWT utils', () => {
  const mockSecret = 'test-secret';
  const payload = { id: 'user123' };

  beforeEach(() => {
    process.env.JWT_SECRET = mockSecret;
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('generateToken', () => {
    it('should generate a token with the correct parameters', () => {
      (jwt.sign as jest.Mock).mockReturnValue('mockToken');

      const token = generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, mockSecret, { expiresIn: '1h' });
      expect(token).toBe('mockToken');
    });

    it('should throw an error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateToken(payload)).toThrow(
        'API Secret not defined. Unable to generate JWT.',
      );
    });
  });

  describe('verifyToken', () => {
    it('it should return the ID from the token if it is valid', () => {
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      const userId = verifyToken('mockToken');

      expect(jwt.verify).toHaveBeenCalledWith('mockToken', mockSecret);
      expect(userId).toBe('user123');
    });

    it('should throw an error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      expect(() => verifyToken('mockToken')).toThrow(
        'API Secret not defined. Unable to generate JWT.',
      );
    });
  });
});
