import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value) {
    throw new Error('Missing APP_ENCRYPTION_KEY');
  }

  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }

  return key;
}

export function encryptSecret(plaintext) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSecret(ciphertext) {
  const payload = Buffer.from(ciphertext, 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function signToken(value, purpose = 'default') {
  return createHmac('sha256', getEncryptionKey())
    .update(`${purpose}:${value}`)
    .digest('base64url');
}
