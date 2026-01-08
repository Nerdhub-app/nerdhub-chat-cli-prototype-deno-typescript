import { DEFAULT_KV_STORAGE_PATH } from "../kv/kv.consts.ts";

export const KV_STORAGE_PATH = Deno.env.get("KV_STORAGE_PATH") ??
  DEFAULT_KV_STORAGE_PATH;
export const KV_URI = Deno.env.get("KV_URI");
