import { authService } from '@services/auth/authService';
import { prisma } from '@db/client';
import bcrypt from 'bcrypt';

jest.mock('@prisma/client');
jest.mock('bcrypt');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create new user and return user and login', async () => {
      const fakeGivenName = { id: 'uuid-1', first_name: 'John' };
      const fakeSurname = { id: 'uuid-2', surname: 'Doe' };
      const fakeUser = { id: 'uuid-3', login: 'jdoe' };

      (prisma.givenName.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.givenName.create as jest.Mock).mockResolvedValue(fakeGivenName);

      (prisma.surname.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surname.create as jest.Mock).mockResolvedValue(fakeSurname);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await authService.registerUser({
        first_name: 'John',
        surname: 'Doe',
        password: 'password123',
      });

      expect(prisma.givenName.findFirst).toBeCalledWith({
        where: { first_name: 'John' },
      });
      expect(prisma.givenName.create).toBeCalledWith({ data: { first_name: 'John' } });

      expect(prisma.surname.findFirst).toBeCalledWith({ where: { surname: 'Doe' } });
      expect(prisma.surname.create).toBeCalledWith({ data: { surname: 'Doe' } });

      expect(prisma.user.findUnique).toBeCalledWith({ where: { login: 'jdoe' } });
      expect(prisma.user.create).toBeCalled();

      expect(result.user).toEqual(fakeUser);
      expect(result.login).toBe('jdoe');
    });
  });

  describe('loginUser', () => {
    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(authService.loginUser('jdoe', 'pass')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error if password invalid', async () => {
      const fakeUser = { id: 'uuid-3', login: 'jdoe', password_hash: 'hashed' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginUser('jdoe', 'wrongpass')).rejects.toThrow(
        'Invalid password'
      );
    });

    it('should return token if login successful', async () => {
      const fakeUser = { id: 'uuid-3', login: 'jdoe', password_hash: 'hashed' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // mock generateToken
      jest.mock('@utils/jwt', () => ({
        generateToken: () => 'token123',
      }));

      const token = await authService.loginUser('jdoe', 'correctpass');
      expect(token).toBe('token123');
    });
  });
});
