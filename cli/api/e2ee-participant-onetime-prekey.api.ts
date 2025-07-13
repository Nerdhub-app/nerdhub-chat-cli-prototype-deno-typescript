import { cliContext } from "../context.ts";
import ApiFetch from "../helpers/api-fetch.helper.ts";
import { getUserE2EEParticipantsEndpoint } from "./e2ee-participant.api.ts";
import type {
  CreateManyOnetimePreKeysRequestPayload,
  CreateManyOnetimePreKeysResponsePayload,
} from "@scope/server/payload";

export const ONETIME_PREKEYS_ENDPOINT = "/onetime_prekeys";

export function getE2EEParticipantOnetimePrekeysEndpoint(
  userId: string,
  e2eeParticipantId: string,
) {
  return getUserE2EEParticipantsEndpoint(userId) + "/" + e2eeParticipantId +
    ONETIME_PREKEYS_ENDPOINT;
}

export default class E2EEParticipantOnetimePreKeyAPI {
  static createMany(
    userId: string,
    e2eeParticipantId: string,
    payload: CreateManyOnetimePreKeysRequestPayload,
    append = false,
  ) {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot create many one-time prekeys without the context's JWT",
      );
    }
    let endpoint = getE2EEParticipantOnetimePrekeysEndpoint(
      userId,
      e2eeParticipantId,
    );
    if (append) endpoint += "?append=true";
    return ApiFetch.post<
      CreateManyOnetimePreKeysRequestPayload,
      CreateManyOnetimePreKeysResponsePayload
    >(endpoint, payload, {
      bearerToken: cliContext.jwt,
    });
  }
}
