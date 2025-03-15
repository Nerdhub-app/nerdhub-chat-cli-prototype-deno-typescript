import { db } from "../database/db.connection.ts";

export type CreateE2EEParticipantPrekeyBundlesDTO = {
  userId: string;
  participantId: string;
  pubIdentityKey: Uint8Array;
  privIdentityKey: Uint8Array;
  pubSignedPrekey: Uint8Array;
  pubSignedPrekeySignature: Uint8Array;
  privSignedPrekey: Uint8Array;
};

export default class E2EEParticipantPrekeyBundleRepository {
  static create(dto: CreateE2EEParticipantPrekeyBundlesDTO) {
    const sql = `
    INSERT INTO e2ee_participants_prekey_bundles (
      user_id,
      participant_id,
      pub_identity_key,
      priv_identity_key,
      pub_signed_prekey,
      pub_signed_prekey_signature,
      priv_signed_prekey
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const query = db.prepare(sql);
    const result = query.run(
      dto.userId,
      dto.participantId,
      dto.pubIdentityKey,
      dto.privIdentityKey,
      dto.pubSignedPrekey,
      dto.pubSignedPrekeySignature,
      dto.privSignedPrekey,
    );
    console.log(result);
  }
}
