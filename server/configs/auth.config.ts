export const ACCESS_TOKEN_SECRET = Deno.env.get("ACCESS_TOKEN_SECRET") ??
  "your-access-token-secret";
export const ACCESS_TOKEN_LIFETIME = Deno.env.get("ACCESS_TOKEN_LIFETIME") ??
  "1h";

export const REFRESH_TOKEN_SECRET = Deno.env.get("REFRESH_TOKEN_SECRET") ??
  "your-refresh-token-secret";
export const REFRESH_TOKEN_LIFETIME = Deno.env.get("REFRESH_TOKEN_LIFETIME") ??
  "7d";
