import { encryptCredential, decryptCredential, getEncryptionKey } from './security/credential.vault.js';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  } else {
    passed++;
  }
}

console.log('🧪 Starting Credential Vault Security & Encryption Test Suite (Phase 2.8)...\n');

// Backup original key
const originalKey = process.env.PULSEBOARD_ENCRYPTION_KEY;

try {
  // Setup a valid 32-byte test key (64 hex characters)
  const testKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.PULSEBOARD_ENCRYPTION_KEY = testKeyHex;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Encryption & Decryption Roundtrip
  // ──────────────────────────────────────────────────────────────────────────
  console.log('1) Testing AES-256-GCM Encryption & Decryption Roundtrip');
  const secretToken = 'glpat-sec_test_token_998877665544332211';
  const encryptedObj = encryptCredential(secretToken);

  assert(typeof encryptedObj.encrypted === 'string', 'Encrypted ciphertext must be string');
  assert(typeof encryptedObj.iv === 'string', 'IV must be string');
  assert(typeof encryptedObj.authTag === 'string', 'AuthTag must be string');
  assert(!encryptedObj.encrypted.includes(secretToken), 'Ciphertext must NOT contain plaintext token');

  const decryptedToken = decryptCredential(encryptedObj);
  assert(decryptedToken === secretToken, 'Decrypted token must exactly match original plaintext token');
  console.log('  ✅ Encryption/decryption roundtrip succeeded.');

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Tampered Ciphertext / AuthTag Rejection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n2) Testing Tampered Ciphertext / AuthTag Rejection');
  const tamperedObj = { ...encryptedObj, encrypted: encryptedObj.encrypted.substring(0, encryptedObj.encrypted.length - 2) + '00' };

  let tamperedError = false;
  try {
    decryptCredential(tamperedObj);
  } catch (err) {
    tamperedError = true;
  }
  assert(tamperedError === true, 'Tampered ciphertext must fail decryption with tag mismatch');
  console.log('  ✅ Tampered ciphertext correctly rejected.');

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Wrong Key Decryption Failure
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n3) Testing Wrong Key Decryption Failure');
  const wrongKeyHex = '9999999999abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.PULSEBOARD_ENCRYPTION_KEY = wrongKeyHex;

  let wrongKeyError = false;
  try {
    decryptCredential(encryptedObj);
  } catch (err) {
    wrongKeyError = true;
  }
  assert(wrongKeyError === true, 'Decryption with wrong key must fail');
  console.log('  ✅ Decryption with wrong key correctly failed.');

  // Restore valid test key
  process.env.PULSEBOARD_ENCRYPTION_KEY = testKeyHex;

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Key Length & Missing Key Validation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n4) Testing Missing / Invalid Key Length Validation');
  delete process.env.PULSEBOARD_ENCRYPTION_KEY;

  let missingKeyError = false;
  try {
    encryptCredential('dummy');
  } catch (err) {
    missingKeyError = true;
    assert(err.message.includes('missing'), 'Error message must specify missing encryption key');
  }
  assert(missingKeyError === true, 'Encryption without PULSEBOARD_ENCRYPTION_KEY must fail');

  process.env.PULSEBOARD_ENCRYPTION_KEY = 'too-short-key';
  let invalidLengthError = false;
  try {
    encryptCredential('dummy');
  } catch (err) {
    invalidLengthError = true;
    assert(err.message.includes('length'), 'Error message must specify invalid key length');
  }
  assert(invalidLengthError === true, 'Encryption with invalid key length must fail');
  console.log('  ✅ Key length and missing key validations passed.');

  // ──────────────────────────────────────────────────────────────────────────
  // 5. UTF-8 32-Character Key Representation Support
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n5) Testing 32-character UTF-8 Key Support');
  process.env.PULSEBOARD_ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 UTF-8 chars
  const encUtf8 = encryptCredential('test-pass');
  const decUtf8 = decryptCredential(encUtf8);
  assert(decUtf8 === 'test-pass', '32-character UTF-8 key encryption/decryption must succeed');
  console.log('  ✅ 32-character UTF-8 key support verified.');

} finally {
  if (originalKey) {
    process.env.PULSEBOARD_ENCRYPTION_KEY = originalKey;
  } else {
    delete process.env.PULSEBOARD_ENCRYPTION_KEY;
  }
}

console.log(`\n${'─'.repeat(60)}`);
if (failed > 0) {
  console.error(`❌ ${failed} test(s) FAILED, ${passed} passed.`);
  process.exit(1);
} else {
  console.log(`🎉 ALL ${passed} CREDENTIAL VAULT TESTS PASSED SUCCESSFULLY!`);
  process.exit(0);
}
