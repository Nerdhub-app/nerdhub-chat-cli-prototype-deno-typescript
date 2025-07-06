import type { E2EEParticipant } from "../cli.d.ts";
import { cliContext } from "../context.ts";
import ApiFetch from "../helpers/api-fetch.helper.ts";

export const E2EE_PARTICIPANTS_ENDPOINT = "/e2ee_participants";

export function getUserE2EEParticipantsEndpoint(userId: string) {
  return "/users/" + userId + E2EE_PARTICIPANTS_ENDPOINT;
}

export type CreateE2EEParticipantPayload = Record<
  "pubIdentityKey" | "pubSignedPreKey" | "signedPreKeySignature",
  string
>;

export type UpdateE2EEParticipantPreKeyBundlePayload =
  CreateE2EEParticipantPayload;

export default class E2EEParticipantAPI {
  static create(userId: string, payload: CreateE2EEParticipantPayload) {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot create an E2EE participant without the context's JWT",
      );
    }
    const endpoint = getUserE2EEParticipantsEndpoint(userId);
    return ApiFetch.post<CreateE2EEParticipantPayload, E2EEParticipant>(
      endpoint,
      payload,
      {
        deviceHash: cliContext.deviceHash,
        bearerToken: cliContext.jwt,
      },
    );
  }

  static updatePreKeyBundle(
    userId: string,
    participantId: string,
    payload: UpdateE2EEParticipantPreKeyBundlePayload,
  ) {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot update the E2EE participant's prekey bundle without the context's JWT",
      );
    }
    const endpoint = getUserE2EEParticipantsEndpoint(userId) + "/" +
      participantId + "/prekey_bundle";
    return ApiFetch.patch<
      UpdateE2EEParticipantPreKeyBundlePayload,
      E2EEParticipant
    >(
      endpoint,
      payload,
      {
        bearerToken: cliContext.jwt,
      },
    );
  }
}
