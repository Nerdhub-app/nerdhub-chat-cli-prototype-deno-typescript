import E2EEParticipantOnetimePreKeysRepository from "../repository/e2ee-participant-onetime-prekeys.repository.ts";
import {
  HttpReponseStatus,
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type { RequestE2EEParticipantContext } from "@scope/server/types";
import type {
  CreateManyOnetimePreKeysRequestPayload,
  CreateManyOnetimePreKeysResponsePayload,
} from "@scope/server/payload";

type CreateManyOnetimePreKeysRequestQuery = {
  append?: string;
};

export default class E2EEParticipantOnetimePreKeysController {
  static async handleCreateManyOnetimePreKeys(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { e2eeParticipant } = req.context as RequestE2EEParticipantContext;
    const payload = req.body as CreateManyOnetimePreKeysRequestPayload;
    const query = req.query as CreateManyOnetimePreKeysRequestQuery;

    await E2EEParticipantOnetimePreKeysRepository.createManyByParticipantId(
      e2eeParticipant.id,
      payload,
      !!query.append,
    );

    const resBody: CreateManyOnetimePreKeysResponsePayload =
      await E2EEParticipantOnetimePreKeysRepository
        .findManyByParticipantId(e2eeParticipant.id);
    return new JSONResponse(resBody, HttpReponseStatus.CREATED);
  }
}
