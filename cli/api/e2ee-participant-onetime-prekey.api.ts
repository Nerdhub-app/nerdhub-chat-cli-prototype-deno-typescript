import { cliContext } from "../context.ts";
import ApiFetch from "../helpers/api-fetch.helper.ts";
import type { ServerE2EEParticipantOnetimePrekey } from "../cli.d.ts";
import { getUserE2EEParticipantsEndpoint } from "./e2ee-participant.api.ts";

export const ONETIME_PREKEYS_ENDPOINT = "/onetime_prekeys";

export function getE2EEParticipantOnetimePrekeysEndpoint(
  userId: string,
  e2eeParticipantId: string,
) {
  return getUserE2EEParticipantsEndpoint(userId) + "/" + e2eeParticipantId +
    ONETIME_PREKEYS_ENDPOINT;
}

export type CreateManyOnetimePreKeysPayload = {
  id: string;
  pubKey: string;
}[];

export default class E2EEParticipantOnetimePreKeyAPI {
  static createMany(
    userId: string,
    e2eeParticipantId: string,
    payload: CreateManyOnetimePreKeysPayload,
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
      CreateManyOnetimePreKeysPayload,
      ServerE2EEParticipantOnetimePrekey[]
    >(endpoint, payload, {
      bearerToken: cliContext.jwt,
    });
  }
}
