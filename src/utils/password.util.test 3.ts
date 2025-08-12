import bcrypt from 'bcrypt';
import { hashPassword, verifyPassword } from './password.util';

jest.mock('bcrypt');

describe('Password utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('powinno zwrócić hash wygenerowany przez bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('mockHash');

      const hash = await hashPassword('plainPassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
      expect(hash).toBe('mockHash');
    });
  });

  describe('verifyPassword', () => {
    it('powinno zwrócić true jeśli hasło jest poprawne', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const isValid = await verifyPassword('plainPassword', 'mockHash');

      expect(bcrypt.compare).toHaveBeenCalledWith('plainPassword', 'mockHash');
      expect(isValid).toBe(true);
    });

    it('powinno zwrócić false jeśli hasło jest niepoprawne', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const isValid = await verifyPassword('plainPassword', 'mockHash');

      expect(isValid).toBe(false);
    });
  });
});
