import crypto from 'crypto';
import 'dotenv/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const HMAC_KEYS: Record<number, Buffer> = {
  1: Buffer.from(process.env.DB_HMAC_KEY_V1!, 'hex'),
};

const ENCRYPTION_KEYS: Record<number, Buffer> = {
  1: Buffer.from(process.env.DB_ENCRYPTION_KEY_V1!, 'hex'),
};

export interface EncryptedData {
  iv: string;
  authTag: string;
  value: string;
  keyVersion?: number;
}

export function computeHmac(value: string, keyVersion = 1): string {
  const key = HMAC_KEYS[keyVersion];
  if (!key) throw new Error(`Unsupported HMAC key version: ${keyVersion}`);
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

export function aesGcmEncrypt(plainText: string, keyVersion = 1): string {
  const key = ENCRYPTION_KEYS[keyVersion];
  if (!key) throw new Error(`Unsupported encryption key version: ${keyVersion}`);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

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

export function aesGcmDecrypt(encryptedJson: string): string {
  const { iv, authTag, value, keyVersion } = JSON.parse(encryptedJson) as EncryptedData;

  if (!keyVersion || !ENCRYPTION_KEYS[keyVersion]) {
    throw new Error(`Unsupported key version: ${keyVersion}`);
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEYS[keyVersion],
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
