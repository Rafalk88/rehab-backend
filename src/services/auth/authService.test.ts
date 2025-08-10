import { authService } from '@services/auth/authService';
import type { User, GivenName, Surname } from '@prisma/client';
import { prismaMock } from '../../singleton';
import { hashPassword, verifyPassword } from '@utils/password';
import { generateToken } from '@utils/jwt';

jest.mock('@utils/password');
jest.mock('@utils/jwt');

describe('authService.registerUser', () => {
  const env = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
  });

  describe('registerUser', () => {
    it('should create new user and return user and login', async () => {
      // input danych
      const fakeUserInput = {
        firstName: 'John',
        surname: 'Doe',
        sexId: 'sex-uuid',
        organizationalUnitId: 'org-unit-uuid',
        password: 'plainPassword',
      };

      // mocowanie wartości
      (hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
      prismaMock.givenName.findFirst.mockResolvedValue(null);
      prismaMock.givenName.create.mockResolvedValueOnce({
        id: 'firstname-uuid',
        firstName: 'John',
      } as GivenName);
      prismaMock.surname.findFirst.mockResolvedValue(null);
      prismaMock.surname.create.mockResolvedValueOnce({
        id: 'surname-uuid',
        surname: 'Doe',
      } as Surname);
      const fakeUserFromDb = {
        id: 'user-uuid',
        login: 'jdoe',
        email: 'jdoe@vitala.com',
        passwordHash: 'hashedPassword123',
        mustChangePassword: true,
        organizationalUnitId: 'org-unit-uuid',
        sexId: 'sex-uuid',
        firstNameId: 'firstname-uuid',
        surnameId: 'surname-uuid',
      } as User;
      prismaMock.user.create.mockResolvedValue(fakeUserFromDb);

      // testy
      const result = await authService.registerUser(fakeUserInput, prismaMock);

      expect(result.login).toBe('jdoe');
      expect(result.user).toEqual(fakeUserFromDb);

      expect(prismaMock.givenName.findFirst).toHaveBeenCalledWith({
        where: { firstName: 'john' },
      });
      expect(prismaMock.givenName.create).toHaveBeenCalledWith({
        data: { firstName: 'john' },
      });

      expect(prismaMock.surname.findFirst).toHaveBeenCalledWith({
        where: { surname: 'doe' },
      });
      expect(prismaMock.surname.create).toHaveBeenCalledWith({
        data: { surname: 'doe' },
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          login: 'jdoe',
          email: 'jdoe@vitala.com',
          passwordHash: 'hashedPassword123',
          firstNameId: 'firstname-uuid',
          surnameId: 'surname-uuid',
          sexId: 'sex-uuid',
          organizationalUnitId: 'org-unit-uuid',
          mustChangePassword: true,
        },
      });
    });
  });
});

describe('authService.loginUser', () => {
  const env = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
  });

  it('should return token if login and password are correct', async () => {
    const fakeUser = {
      id: 'user-uuid',
      login: 'jdoe',
      passwordHash: 'hashedPassword123',
    } as User;

    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (generateToken as jest.Mock).mockReturnValue('fake-jwt-token');

    const token = await authService.loginUser('jdoe', 'correctPassword', prismaMock);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { login: 'jdoe' } });
    expect(verifyPassword).toHaveBeenCalledWith('correctPassword', 'hashedPassword123');
    expect(generateToken).toHaveBeenCalledWith({ userId: 'user-uuid' });
    expect(token).toBe('fake-jwt-token');
  });

  it('should throw error if user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.loginUser('unknownUser', 'anyPassword', prismaMock)
    ).rejects.toThrow('User not found');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { login: 'unknownUser' },
    });
  });

  it('should throw error if password is invalid', async () => {
    const fakeUser = {
      id: 'user-uuid',
      login: 'jdoe',
      passwordHash: 'hashedPassword123',
    } as User;

    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.loginUser('jdoe', 'wrongPassword', prismaMock)
    ).rejects.toThrow('Invalid password');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { login: 'jdoe' } });
    expect(verifyPassword).toHaveBeenCalledWith('wrongPassword', 'hashedPassword123');
  });
});
