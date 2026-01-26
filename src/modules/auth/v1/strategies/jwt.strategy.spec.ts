// jwt.strategy.spec.ts
import { jest } from '@jest/globals';

describe('JwtStrategy', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should use JWT_SECRET and set extractor', async () => {
    process.env.JWT_SECRET = 'superSecret123';

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('passport-jwt', () => ({
        ExtractJwt: {
          fromAuthHeaderAsBearerToken: jest.fn(() => {
            return (req: any) => {
              const auth = req?.headers?.authorization;
              if (!auth?.startsWith('Bearer ')) return null;
              return auth.slice(7);
            };
          }),
        },

        Strategy: class MockStrategy {
          name = 'jwt';
          constructor(options: any) {
            (this as any).options = options;
          }
        },
      }));

      const { JwtStrategy } = await import('./jwt.strategy.js');

      const strategy = new JwtStrategy();

      const extractor = (strategy as any).options.jwtFromRequest;
      expect(typeof extractor).toBe('function');

      expect((strategy as any).options.secretOrKey).toBe('superSecret123');

      const token = extractor({
        headers: { authorization: 'Bearer abc.def.ghi' },
      });
      expect(token).toBe('abc.def.ghi');
    });
  });

  it('should map JWT payload in validate()', async () => {
    process.env.JWT_SECRET = 'superSecret123';

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('passport-jwt', () => ({
        ExtractJwt: {
          fromAuthHeaderAsBearerToken: jest.fn(() => () => null),
        },
        Strategy: class MockStrategy {
          name = 'jwt';
          constructor(options: any) {
            (this as any).options = options;
          }
        },
      }));

      const { JwtStrategy } = await import('./jwt.strategy.js');
      const strategy = new JwtStrategy();

      const result = await strategy.validate({
        sub: 'user-123',
        emailHmac: 'hmac123',
        emailMasked: 'a***b',
      });

      expect(result).toEqual({
        userId: 'user-123',
        email_hmac: 'hmac123',
        email_masked: 'a***b',
      });
    });
  });
});
