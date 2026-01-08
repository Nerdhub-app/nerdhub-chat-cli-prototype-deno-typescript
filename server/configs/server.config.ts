/**
 * The port number on which the server will listen for incoming HTTP requests.
 */
export const SERVER_PORT = Deno.env.get("PORT")
  ? Number(Deno.env.get("PORT"))
  : 8000;

/**
 * The timeout for unreturned HTTP responses in milliseconds.
 */
export const UNRETURNED_HTTP_RESPONSE_TIMEOUT =
  Deno.env.get("UNRETURNED_HTTP_RESPONSE_TIMEOUT")
    ? Number(Deno.env.get("UNRETURNED_HTTP_RESPONSE_TIMEOUT"))
    : undefined;
