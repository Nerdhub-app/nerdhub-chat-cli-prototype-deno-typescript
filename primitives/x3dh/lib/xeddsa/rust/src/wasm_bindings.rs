// wasm_bindings.rs

use wasm_bindgen::prelude::*;

use crate::xed25519::{PrivateKey, PublicKey};
use crate::xeddsa::{Sign, Verify};

// Constants for array lengths
const SIGNATURE_LENGTH: usize = 64;

// Helper function to convert JavaScript Uint8Array to Rust array - NOT exported to WASM
fn js_array_to_u8_32(array: &[u8]) -> Result<[u8; 32], JsValue> {
    if array.len() != 32 {
        return Err(JsValue::from_str("Array must be 32 bytes"));
    }
    
    let mut result = [0u8; 32];
    result.copy_from_slice(array);
    Ok(result)
}

// Helper function to convert JavaScript Uint8Array to Rust array for signatures - NOT exported to WASM
fn js_array_to_u8_64(array: &[u8]) -> Result<[u8; 64], JsValue> {
    if array.len() != 64 {
        return Err(JsValue::from_str("Array must be 64 bytes"));
    }
    
    let mut result = [0u8; 64];
    result.copy_from_slice(array);
    Ok(result)
}

// Wrapper for sign
#[wasm_bindgen]
pub fn sign(private_key_bytes: &[u8], message: &[u8]) -> Result<Vec<u8>, JsValue> {
    let private_key_array = js_array_to_u8_32(private_key_bytes)?;
    let private_key = PrivateKey::from(&private_key_array);
    
    // Specify the type explicitly to resolve the ambiguity
    let signature: [u8; SIGNATURE_LENGTH] = private_key.sign(message);
    Ok(signature.to_vec())
}

// Wrapper for verify
#[wasm_bindgen]
pub fn verify(public_key_bytes: &[u8], message: &[u8], signature: &[u8]) -> Result<bool, JsValue> {
    let public_key_array = js_array_to_u8_32(public_key_bytes)?;
    let public_key = PublicKey(public_key_array);
    
    let signature_array = js_array_to_u8_64(signature)?;
    
    match public_key.verify(message, &signature_array) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false) // Return false for verification failure rather than error
    }
}
