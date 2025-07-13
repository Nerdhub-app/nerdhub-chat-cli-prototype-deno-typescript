import z from "zod";

export const createE2EEParticipantPayloadSchema = z.object({
  pubIdentityKey: z.string().min(1),
  pubSignedPreKey: z.string().min(1),
  signedPreKeySignature: z.string().min(1),
});

export const updateE2EEParticipantPreKeyBundlePayloadSchema =
  createE2EEParticipantPayloadSchema;
