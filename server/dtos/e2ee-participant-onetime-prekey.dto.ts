import z from "zod";
import type { OnetimePreKey } from "../database/db.d.ts";

export const createManyOnetimePreKeysRequestSchema = z.array(
  z.object({
    id: z.string().min(1),
    pubKey: z.string().min(1),
  }),
);
export type CreateManyOnetimePreKeysRequestDTO = z.infer<
  typeof createManyOnetimePreKeysRequestSchema
>;
export type CreateManyOnetimePreKeysResponseDTO = OnetimePreKey[];
