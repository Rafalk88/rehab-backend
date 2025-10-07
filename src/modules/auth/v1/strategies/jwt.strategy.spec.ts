import { jest } from '@jest/globals';
import { JwtStrategy } from './jwt.strategy.js';

jest.mock('passport-jwt', () => ({
  Strategy: jest.fn().mockImplementation((options) => ({
    name: 'jwt',
    options,
    authenticate: jest.fn(),
  })),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(() => 'mockExtractor'),
  },
}));

describe('JwtStrategy', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('constructor', () => {
    it('should use default secret if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      const strategy = new JwtStrategy();

      // @ts-expect-error - mock adds options
      expect(strategy.options.secretOrKey).toBe('secretForJWT');
      // @ts-expect-error
      expect(strategy.options.jwtFromRequest).toBe('mockExtractor');
    });

    it('should use JWT_SECRET from environment variable', () => {
      process.env.JWT_SECRET = 'mySecret123';

      const strategy = new JwtStrategy();

      // @ts-expect-error
      expect(strategy.options.secretOrKey).toBe('mySecret123');
    });
  });

  describe('validate', () => {
    it('should map JWT payload to user object', async () => {
      const strategy = new JwtStrategy();
      const payload = { sub: 'user-123', email: 'test@example.com' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });
  });
});
