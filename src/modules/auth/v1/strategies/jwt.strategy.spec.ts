import { jest } from '@jest/globals';
import { AppError } from '#common/errors/app.error.js';

jest.unstable_mockModule('passport-jwt', () => {
  const Strategy = jest.fn().mockImplementation(function (options) {
    // @ts-ignore - mock Strategy object
    this.options = options;
    // @ts-ignore
    this.authenticate = jest.fn();
    // @ts-ignore
    this.name = 'jwt';
  });

  return {
    Strategy,
    ExtractJwt: {
      fromAuthHeaderAsBearerToken: jest.fn(() => 'mockExtractor'),
    },
  };
});

const { JwtStrategy } = await import('./jwt.strategy.js');

import 'dotenv/config';

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
    it('✅ should use JWT_SECRET from env', () => {
      process.env.JWT_SECRET = 'superSecret123';

      const strategy = new JwtStrategy();

      // @ts-expect-error - mock add options
      expect(strategy.options.secretOrKey).toBe('superSecret123');
      // @ts-expect-error
      expect(strategy.options.jwtFromRequest).toBe('mockExtractor');
    });

    it('❌ should throw AppError when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => new JwtStrategy()).toThrow(AppError);
      expect(() => new JwtStrategy()).toThrow(
        /Missing required environment variable: JWT_SECRET. Application startup aborted for security reasons./,
      );
    });
  });

  describe('validate', () => {
    it('✅ should map JWT payload to user object (emailHmac)', async () => {
      process.env.JWT_SECRET = 'superSecret123';
      const strategy = new JwtStrategy();
      const payload = { sub: 'user-123', emailHmac: 'abc123hmac', emailMasked: 'a****3' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email_hmac: 'abc123hmac',
        email_masked: 'a****3',
      });
    });

    it('✅ should handle payload without emailHmac gracefully', async () => {
      process.env.JWT_SECRET = 'superSecret123';
      const strategy = new JwtStrategy();
      const payload = { sub: 'user-123' };

      const result = await strategy.validate(payload as any);

      expect(result).toEqual({
        userId: 'user-123',
        emailHmac: undefined,
      });
    });
  });
});
