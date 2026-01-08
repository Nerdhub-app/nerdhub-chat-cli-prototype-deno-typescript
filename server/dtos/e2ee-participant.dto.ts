import z from "zod";
import type { E2EEParticipant } from "../database/db.d.ts";

export const createE2EEParticipantRequestSchema = z.object({
  pubIdentityKey: z.string().min(1),
  pubSignedPreKey: z.string().min(1),
  signedPreKeySignature: z.string().min(1),
});
export type CreateE2EEParticipantRequestDTO = z.infer<
  typeof createE2EEParticipantRequestSchema
>;
export type CreateE2EEParticipantResponseDTO = E2EEParticipant;

export const updateE2EEParticipantPreKeyBundleRequestSchema =
  createE2EEParticipantRequestSchema;
export type UpdateE2EEParticipantPreKeyBundleRequestDTO = z.infer<
  typeof updateE2EEParticipantPreKeyBundleRequestSchema
>;
export type UpdateE2EEParticipantPreKeyBundleResponseDTO = E2EEParticipant;
