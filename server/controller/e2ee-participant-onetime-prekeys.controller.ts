import E2EEParticipantOnetimePreKeysRepository from "../repository/e2ee-participant-onetime-prekeys.repository.ts";
import {
  HttpReponseStatus,
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type {
  RequestAuthUserContext,
  RequestE2EEParticipantContext,
} from "@scope/server/types";

type CreateManyOnetimePreKeysDTO = { id: string; pubKey: string }[];

type CreateManyOnetimePreKeysRequestQuery = {
  append?: string;
};

export default class E2EEParticipantOnetimePreKeysController {
  static async handleCreateManyOnetimePreKeys(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { authUser, e2eeParticipant } = req.context as
      & RequestAuthUserContext
      & RequestE2EEParticipantContext;
    const dto = req.body as CreateManyOnetimePreKeysDTO;
    const query = req.query as CreateManyOnetimePreKeysRequestQuery;

    const onetimePreKeys = query.append
      ? await E2EEParticipantOnetimePreKeysRepository
        .appendManyForParticipant(
          [authUser.id, e2eeParticipant.id],
          dto,
        )
      : await E2EEParticipantOnetimePreKeysRepository
        .createMany([authUser.id, e2eeParticipant.id], dto);

    return new JSONResponse(onetimePreKeys, HttpReponseStatus.CREATED);
  }
}
