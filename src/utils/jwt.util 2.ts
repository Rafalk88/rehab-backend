import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Generuje nowy token JWT dla podanego payloadu.
 *
 * @param payload - Dane, które mają zostać zapisane w tokenie.
 * @throws Jeśli zmienna środowiskowa JWT_SECRET nie jest zdefiniowana.
 * @returns Wygenerowany token JWT z domyślnym czasem życia 1h.
 */
export const generateToken = (payload: object) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('API Secret not defined. Unable to generate JWT.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Weryfikuje podany token JWT i zwraca ID użytkownika z payloadu.
 *
 * @param token - Token JWT do zweryfikowania.
 * @throws Jeśli zmienna środowiskowa JWT_SECRET nie jest zdefiniowana lub token jest nieprawidłowy.
 * @returns ID użytkownika zapisane w tokenie.
 */
export const verifyToken = (token: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('API Secret not defined. Unable to generate JWT.');
  }

  const payload = jwt.verify(token, JWT_SECRET) as { id: string };
  return payload.id;
};
