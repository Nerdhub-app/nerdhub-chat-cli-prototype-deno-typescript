import { cliContext } from "../context.ts";
import ApiFetch from "../helpers/api-fetch.helper.ts";
import type {
  CreateE2EEParticipantRequestPayload,
  CreateE2EEParticipantResponsePayload,
  UpdateE2EEParticipantPreKeyBundleRequestPayload,
  UpdateE2EEParticipantPreKeyBundleResponsePayload,
} from "@scope/server/payload";

export const E2EE_PARTICIPANTS_ENDPOINT = "/e2ee_participants";

export function getUserE2EEParticipantsEndpoint(userId: string) {
  return "/users/" + userId + E2EE_PARTICIPANTS_ENDPOINT;
}

export default class E2EEParticipantAPI {
  static create(userId: string, payload: CreateE2EEParticipantRequestPayload) {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot create an E2EE participant without the context's JWT",
      );
    }
    const endpoint = getUserE2EEParticipantsEndpoint(userId);
    return ApiFetch.post<
      CreateE2EEParticipantRequestPayload,
      CreateE2EEParticipantResponsePayload
    >(
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
    payload: UpdateE2EEParticipantPreKeyBundleRequestPayload,
  ) {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot update the E2EE participant's prekey bundle without the context's JWT",
      );
    }
    const endpoint = getUserE2EEParticipantsEndpoint(userId) + "/" +
      participantId + "/prekey_bundle";
    return ApiFetch.patch<
      UpdateE2EEParticipantPreKeyBundleRequestPayload,
      UpdateE2EEParticipantPreKeyBundleResponsePayload
    >(
      endpoint,
      payload,
      {
        bearerToken: cliContext.jwt,
      },
    );
  }
}
