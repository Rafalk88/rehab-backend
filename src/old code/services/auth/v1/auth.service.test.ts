import { authService } from '@/old code/services/auth/v1/auth.service.js';
import { prismaMock } from '@/__mocks__/prismaClient';
import { hashPassword } from '@/utils/password.util';
import { generateToken } from '@/utils/jwt.util';
import {
  getOrCreateFirstName,
  getOrCreateSurname,
  generateUniqueLogin,
  verifyLoginCredentials,
  checkLoginRestrictions,
  updateLoginSuccess,
} from '@/old code/services/auth/v1/helpers/auth.helpers.js';
import { User } from '@prisma/client';

jest.mock('@utils/password.util');
jest.mock('@utils/jwt.util');
jest.mock('@services/auth/v1/helpers/auth.helpers');

describe('authService.registerUser', () => {
  const env = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
  });

  it('should create new user and return user and login', async () => {
    const fakeUserInput = {
      firstName: 'John',
      surname: 'Doe',
      sexId: 'sex-uuid',
      organizationalUnitId: 'org-unit-uuid',
      password: 'plainPassword',
    };

    // Mocks helperów
    (getOrCreateFirstName as jest.Mock).mockResolvedValue({
      id: 'firstname-uuid',
      firstName: 'john',
    });
    (getOrCreateSurname as jest.Mock).mockResolvedValue({ id: 'surname-uuid', surname: 'doe' });
    (generateUniqueLogin as jest.Mock).mockResolvedValue('jdoe');

    (hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');

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
    };

    prismaMock.user.create.mockResolvedValue(fakeUserFromDb as User);

    const result = await authService.registerUser(fakeUserInput, prismaMock);

    expect(result.login).toBe('jdoe');
    expect(result.user).toEqual(fakeUserFromDb);

    expect(getOrCreateFirstName).toHaveBeenCalledWith('John', prismaMock);
    expect(getOrCreateSurname).toHaveBeenCalledWith('Doe', prismaMock);
    expect(generateUniqueLogin).toHaveBeenCalledWith('John', 'Doe', prismaMock);

    expect(hashPassword).toHaveBeenCalledWith('plainPassword');

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

describe('authService.loginUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return token if login and password are correct', async () => {
    const fakeUser = {
      id: 'user-uuid',
      login: 'jdoe',
      passwordHash: 'hashedPassword123',
      failedLoginAttempts: 0,
      isActive: true,
      isLocked: false,
      lockedUntil: null,
      mustChangePassword: false,
    };

    prismaMock.user.findUnique.mockResolvedValue(fakeUser as User);

    (verifyLoginCredentials as jest.Mock).mockResolvedValue(undefined);
    (checkLoginRestrictions as jest.Mock).mockImplementation(() => {});
    (updateLoginSuccess as jest.Mock).mockResolvedValue(undefined);
    (generateToken as jest.Mock).mockReturnValue('fake-jwt-token');

    const token = await authService.loginUser('jdoe', 'correctPassword', prismaMock);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { login: 'jdoe' } });
    expect(verifyLoginCredentials).toHaveBeenCalledWith(
      {
        id: 'user-uuid',
        failedLoginAttempts: 0,
        passwordHash: 'hashedPassword123',
      },
      'correctPassword',
      prismaMock,
    );
    expect(checkLoginRestrictions).toHaveBeenCalledWith({
      isActive: true,
      isLocked: false,
      lockedUntil: null,
      mustChangePassword: false,
    });
    expect(updateLoginSuccess).toHaveBeenCalledWith('user-uuid', prismaMock);
    expect(generateToken).toHaveBeenCalledWith({ userId: 'user-uuid' });
    expect(token).toBe('fake-jwt-token');
  });

  it('should throw error if user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(authService.loginUser('unknownUser', 'anyPassword', prismaMock)).rejects.toThrow(
      'Invalid login or password',
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { login: 'unknownUser' } });
  });

  it('should propagate error from verifyLoginCredentials if password invalid', async () => {
    const fakeUser = {
      id: 'user-uuid',
      login: 'jdoe',
      passwordHash: 'hashedPassword123',
      failedLoginAttempts: 0,
      isActive: true,
      isLocked: false,
      lockedUntil: null,
      mustChangePassword: false,
    };

    prismaMock.user.findUnique.mockResolvedValue(fakeUser as User);

    (verifyLoginCredentials as jest.Mock).mockRejectedValue(new Error('Invalid password'));

    await expect(authService.loginUser('jdoe', 'wrongPassword', prismaMock)).rejects.toThrow(
      'Invalid password',
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { login: 'jdoe' } });
    expect(verifyLoginCredentials).toHaveBeenCalledWith(
      {
        id: 'user-uuid',
        failedLoginAttempts: 0,
        passwordHash: 'hashedPassword123',
      },
      'wrongPassword',
      prismaMock,
    );
  });
});
