/**
 * The timeout for unreturned HTTP responses in milliseconds.
 */
export const UNRETURNED_HTTP_RESPONSE_TIMEOUT =
  Deno.env.get("UNRETURNED_HTTP_RESPONSE_TIMEOUT")
    ? Number(Deno.env.get("UNRETURNED_HTTP_RESPONSE_TIMEOUT"))
    : 10_000;
