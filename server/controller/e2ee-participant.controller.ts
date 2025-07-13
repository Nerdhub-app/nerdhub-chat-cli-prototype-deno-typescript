import {
  HttpReponseStatus,
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type {
  E2EEParticipant,
  RequestAuthUserContext,
  RequestDeviceHashContext,
  RequestE2EEParticipantContext,
} from "../server.d.ts";
import E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import type {
  CreateE2EEParticipantRequestPayload,
  CreateE2EEParticipantResponsePayload,
  UpdateE2EEParticipantPreKeyBundleRequestPayload,
  UpdateE2EEParticipantPreKeyBundleResponsePayload,
} from "@scope/server/payload";

export default class E2EEParticipantController {
  static async handleCreateE2EEParticipant(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { deviceHash, authUser } = req.context as
      & RequestDeviceHashContext
      & RequestAuthUserContext;
    const payload = req.body as CreateE2EEParticipantRequestPayload;

    const res = await E2EEParticipantRepository.create(
      authUser.id,
      deviceHash,
      payload,
    );

    const resBody: CreateE2EEParticipantResponsePayload =
      await E2EEParticipantRepository.findById(res.insertId) as E2EEParticipant;
    return new JSONResponse(resBody, HttpReponseStatus.CREATED);
  }

  static async handleUpdateE2EEParticipantPreKeyBundle(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { e2eeParticipant } = req.context as RequestE2EEParticipantContext;
    const payload = req.body as UpdateE2EEParticipantPreKeyBundleRequestPayload;

    await E2EEParticipantRepository.updatePreKeyBundleById(
      e2eeParticipant.id,
      payload,
    );

    const resBody: UpdateE2EEParticipantPreKeyBundleResponsePayload =
      await E2EEParticipantRepository.findById(
        e2eeParticipant.id,
      ) as E2EEParticipant;
    return resBody;
  }
}
