/**
 * The AES algorithm to use for encryption.
 * AES-CTR because we only need the IV for encryption security for the data storage.
 */
export const AES_ALGORITHM = "aes-256-ctr";

/**
 * The length of the encryption key.
 * The length of the encryption key must be 32 bytes (256 bits)
 * because we are using the aes-256-ctr algorithms which requires a key of a length of 256 bits.
 */
export const ENCRYPTION_KEY_LENGTH = 32;

/**
 * Bytes length of the Initialization Vector.
 * aes-256-ctr must be 16 bytes (128 bits) length.
 */
export const IV_BYTES_LENGTH = 16;
