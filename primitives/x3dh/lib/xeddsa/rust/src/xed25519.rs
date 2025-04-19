// SPDX-FileCopyrightText: 2023 Dominik George <nik@naturalnet.de>
//
// SPDX-License-Identifier: Apache-2.0

//! Concrete XEdDSA implementation for X25519/Ed25519

use std::convert::From;

use crate::util::hash_i_padding;
use crate::xeddsa::*;

use curve25519_dalek::edwards::EdwardsPoint;
use curve25519_dalek::montgomery::MontgomeryPoint;
use curve25519_dalek::scalar::{clamp_integer, Scalar};
use ed25519::Signature;
use ed25519_dalek::{Verifier, VerifyingKey};
use x25519_dalek;

// Remove rand imports
// use rand::{CryptoRng, RngCore};
use getrandom::getrandom;
use sha2::{Digest, Sha512};

use zeroize::{Zeroize, ZeroizeOnDrop};

const PRIVATE_KEY_LENGTH: usize = 32;
const PUBLIC_KEY_LENGTH: usize = 32;
const SIGNATURE_LENGTH: usize = 64;

/// An X25519 public key
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct PrivateKey(
    /// The byte representation of the key
    pub [u8; PRIVATE_KEY_LENGTH],
);
/// An X25519 public key
pub struct PublicKey(
    /// The byte representation of the key
    pub [u8; PUBLIC_KEY_LENGTH],
);

impl CalculateKeyPair<[u8; PRIVATE_KEY_LENGTH], [u8; PUBLIC_KEY_LENGTH]> for PrivateKey {
    fn calculate_key_pair(&self, sign: u8) -> ([u8; PRIVATE_KEY_LENGTH], [u8; PUBLIC_KEY_LENGTH]) {
        // Clamp the (scalar) private key to be within the curve field
        let clamped = clamp_integer(self.0);

        // Derive Ed25519 public key to verify sign
        let scalar_private_key = Scalar::from_bytes_mod_order(clamped);
        let point_public_key = EdwardsPoint::mul_base(&scalar_private_key);
        if (point_public_key.compress().to_bytes()[31] & 0x80) >> 7 == sign {
            // Sign matches, return verbatim
            (clamped, point_public_key.compress().to_bytes())
        } else {
            // Negate the scalar and calculate new key pair
            let scalar_private_key = (Scalar::ZERO - Scalar::from(1_u8)) * scalar_private_key;
            let point_public_key = EdwardsPoint::mul_base(&scalar_private_key);
            (
                scalar_private_key.to_bytes(),
                point_public_key.compress().to_bytes(),
            )
        }
    }
}

// Modified Sign trait to not require RngCore + CryptoRng
impl Sign<[u8; SIGNATURE_LENGTH], [u8; PRIVATE_KEY_LENGTH], [u8; PUBLIC_KEY_LENGTH]> for PrivateKey
where
    PrivateKey: CalculateKeyPair<[u8; PRIVATE_KEY_LENGTH], [u8; PUBLIC_KEY_LENGTH]>,
{
    // Remove the RngCore + CryptoRng parameter
    fn sign(&self, message: &[u8]) -> [u8; SIGNATURE_LENGTH] {
        // Derive EdDSA key pair
        let (private_key, public_key) = self.calculate_key_pair(0);

        // Take 64 bytes random padding for hash function using getrandom
        let mut nonce = [0u8; 64];
        // Use getrandom directly instead of a RNG implementation
        getrandom(&mut nonce).expect("Failed to generate random bytes");

        // Do hash_1 with SHA-512 over private key, message and nonce
        let padding: [u8; 32] = hash_i_padding(1);
        let mut hasher = Sha512::new();
        hasher.update(padding);
        hasher.update(private_key);
        hasher.update(message);
        hasher.update(nonce);
        let res: [u8; 64] = hasher.finalize().into();

        // Calculate R = rB
        let res_scalar = Scalar::from_bytes_mod_order_wide(&res);
        let res_point = EdwardsPoint::mul_base(&res_scalar);

        // Do SHA-512 hash over R, public key and the message
        let mut hasher = Sha512::new();
        hasher.update(res_point.compress().to_bytes());
        hasher.update(public_key);
        hasher.update(message);
        let hash: [u8; 64] = hasher.finalize().into();

        // Calculate s = r + ha
        // (All operations in curve25519_dalek are (mod q))
        let hash_scalar = Scalar::from_bytes_mod_order_wide(&hash);
        let private_scalar = Scalar::from_bytes_mod_order(private_key);
        let salt = res_scalar + hash_scalar * private_scalar;

        let mut signature = [0u8; SIGNATURE_LENGTH];
        signature[0..32].copy_from_slice(&res_point.compress().to_bytes());
        signature[32..64].copy_from_slice(&salt.to_bytes());

        signature
    }
}

// Modified implementation for Signature
impl Sign<Signature, [u8; PRIVATE_KEY_LENGTH], [u8; PUBLIC_KEY_LENGTH]> for PrivateKey
where
    PrivateKey: CalculateKeyPair<[u8; PRIVATE_KEY_LENGTH], [u8; PUBLIC_KEY_LENGTH]>,
{
    // Remove the RngCore + CryptoRng parameter
    fn sign(&self, message: &[u8]) -> Signature {
        Signature::from_bytes(&self.sign(message))
    }
}

impl From<&[u8; PRIVATE_KEY_LENGTH]> for PrivateKey {
    fn from(value: &[u8; PRIVATE_KEY_LENGTH]) -> PrivateKey {
        let mut value_c: [u8; PRIVATE_KEY_LENGTH] = [0u8; PRIVATE_KEY_LENGTH];
        value_c.copy_from_slice(value);
        PrivateKey(value_c)
    }
}

impl From<&x25519_dalek::StaticSecret> for PrivateKey {
    fn from(value: &x25519_dalek::StaticSecret) -> PrivateKey {
        PrivateKey::from(&value.to_bytes())
    }
}

impl From<PrivateKey> for [u8; PRIVATE_KEY_LENGTH] {
    fn from(value: PrivateKey) -> [u8; PRIVATE_KEY_LENGTH] {
        value.0
    }
}

impl ConvertMont<[u8; PUBLIC_KEY_LENGTH]> for PublicKey {
    fn convert_mont(&self, sign: u8) -> Result<[u8; PUBLIC_KEY_LENGTH], Error> {
        //Convert Montgomery point to Edwards point, forcing the sign
        let edwards_point = MontgomeryPoint(self.0)
            .to_edwards(sign)
            .ok_or(Error::UnusablePublicKey)?;
        Ok(edwards_point.compress().to_bytes())
    }
}

impl Verify<Signature, [u8; PUBLIC_KEY_LENGTH]> for PublicKey
where
    PublicKey: ConvertMont<[u8; PUBLIC_KEY_LENGTH]>,
{
    fn verify(&self, message: &[u8], signature: &Signature) -> Result<(), Error> {
        // Get EdDSA public key and verify using standard Ed25519 implementation
        let public_key = self.convert_mont(0)?;
        let verifying_key =
            VerifyingKey::from_bytes(&public_key).or(Err(Error::UnusablePublicKey))?;
        verifying_key
            .verify(message, signature)
            .or(Err(Error::InvalidSignature))
    }
}

impl Verify<[u8; SIGNATURE_LENGTH], [u8; PUBLIC_KEY_LENGTH]> for PublicKey
where
    PublicKey: ConvertMont<[u8; PUBLIC_KEY_LENGTH]>,
{
    fn verify(&self, message: &[u8], signature: &[u8; SIGNATURE_LENGTH]) -> Result<(), Error> {
        self.verify(message, &Signature::from_bytes(signature))
    }
}

impl From<&x25519_dalek::PublicKey> for PublicKey {
    fn from(value: &x25519_dalek::PublicKey) -> PublicKey {
        PublicKey(value.to_bytes())
    }
}
