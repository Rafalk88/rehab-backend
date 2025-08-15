import bcrypt from 'bcrypt';

/**
 * Haszuje podane hasło przy użyciu algorytmu bcrypt.
 *
 * @param password - Hasło w formie czystego tekstu.
 * @returns Zahaszowane hasło.
 */
export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

/**
 * Weryfikuje, czy podane hasło zgadza się z zapisanym hashem.
 *
 * @param password - Hasło w formie czystego tekstu.
 * @param hash - Hash hasła z bazy danych.
 * @returns True, jeśli hasło jest poprawne; false w przeciwnym wypadku.
 */
export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
