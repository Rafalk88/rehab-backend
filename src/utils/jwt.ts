import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export const generateToken = (payload: object) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('API Secret not defined. Unable to generate JWT.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
