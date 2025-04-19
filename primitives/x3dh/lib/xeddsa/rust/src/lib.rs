// lib.rs
mod util;
mod xeddsa;
mod xed25519;
mod wasm_bindings;

// Re-export items for wasm
pub use wasm_bindings::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
#[cfg(all(feature = "wee_alloc", target_arch = "wasm32"))]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Setup panic hook in debug builds
#[cfg(all(debug_assertions, target_arch = "wasm32"))]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}
