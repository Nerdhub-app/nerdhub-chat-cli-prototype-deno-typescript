import z from "zod";

export const createManyOnetimePreKeysPayloadSchema = z.array(
  z.object({
    id: z.string().min(1),
    pubKey: z.string().min(1),
  }),
);
