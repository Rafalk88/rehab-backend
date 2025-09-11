import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return userId and email from payload', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should work with payload containing only sub', async () => {
      const payload = { sub: 'user-456' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-456',
        email: undefined,
      });
    });
  });

  describe('constructor', () => {
    it('should use default secret if JWT_SECRET not set', () => {
      const original = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const localStrategy = new JwtStrategy();

      expect((localStrategy as any).options.secretOrKey).toBe('secretForJWT');

      process.env.JWT_SECRET = original; // restore
    });

    it('should use JWT_SECRET from env if provided', () => {
      process.env.JWT_SECRET = 'mySecret123';

      const localStrategy = new JwtStrategy();

      expect((localStrategy as any).options.secretOrKey).toBe('mySecret123');
    });
  });
});
