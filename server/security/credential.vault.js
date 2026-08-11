import crypto from 'crypto';

/**
 * Gets and validates the 32-byte encryption key from process.env.PULSEBOARD_ENCRYPTION_KEY.
 * Accepts either:
 *  - 64-character hex-encoded string (32 bytes)
 *  - 32-character raw UTF-8 string (32 bytes)
 * @returns {Buffer}
 */
export function getEncryptionKey() {
  const rawKey = process.env.PULSEBOARD_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('Secure credential storage is unavailable: PULSEBOARD_ENCRYPTION_KEY environment variable is missing.');
  }

  let keyBuffer;
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    keyBuffer = Buffer.from(rawKey, 'hex');
  } else {
    keyBuffer = Buffer.from(rawKey, 'utf8');
  }

  if (keyBuffer.length !== 32) {
    throw new Error('Invalid PULSEBOARD_ENCRYPTION_KEY length. Key must be exactly 32 bytes (or 64 hex characters).');
  }

  return keyBuffer;
}

/**
 * Encrypts a plaintext credential using AES-256-GCM authenticated encryption.
 * @param {string} plaintext - Raw credential string (e.g. PAT / Access Token)
 * @returns {{ encrypted: string, iv: string, authTag: string }}
 */
export function encryptCredential(plaintext) {
  if (typeof plaintext !== 'string' || !plaintext.trim()) {
    throw new Error('Cannot encrypt empty or non-string credential.');
  }

  const keyBuffer = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypts an AES-256-GCM encrypted credential payload.
 * @param {{ encrypted: string, iv: string, authTag: string }} credentialObj
 * @returns {string} Plaintext credential
 */
export function decryptCredential(credentialObj) {
  if (!credentialObj || !credentialObj.encrypted || !credentialObj.iv || !credentialObj.authTag) {
    throw new Error('Invalid encrypted credential payload. Required fields: encrypted, iv, authTag.');
  }

  const keyBuffer = getEncryptionKey();
  const ivBuffer = Buffer.from(credentialObj.iv, 'hex');
  const authTagBuffer = Buffer.from(credentialObj.authTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(credentialObj.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
