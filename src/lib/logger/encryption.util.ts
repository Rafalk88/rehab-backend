import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.DB_ENCRYPTION_KEY!;
const IV_LENGTH = 12;

export interface EncryptedData {
  iv: string;
  authTag: string;
  value: string;
  keyVersion?: number;
}

export function encrypt(plainText: string, keyVersion = 1): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const data: EncryptedData = {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    value: encrypted.toString('hex'),
    keyVersion,
  };

  return JSON.stringify(data);
}

export function decrypt(encryptedJson: string): string {
  const { iv, authTag, value } = JSON.parse(encryptedJson) as EncryptedData;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(KEY, 'hex'),
    Buffer.from(iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(value, 'hex')), decipher.final()]);

  return decrypted.toString('utf8');
}

export function maskString(str: string): string {
  if (str.length <= 2) return '*'.repeat(str.length);
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}
