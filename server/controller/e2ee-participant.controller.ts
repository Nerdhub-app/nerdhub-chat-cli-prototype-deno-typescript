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
import UserRepository from "../repository/user.repository.ts";
import E2EEParticipantOnetimePreKeysRepository from "../repository/e2ee-participant-onetime-prekeys.repository.ts";

type CreateE2EEParticipantRequestDTO = Pick<
  E2EEParticipant,
  | "pubIdentityKey"
  | "pubSignedPreKey"
  | "signedPreKeySignature"
>;

type UpdateE2EEParticipantPreKeyBundleRequestDTO =
  CreateE2EEParticipantRequestDTO;

export default class E2EEParticipantController {
  static async handleCreateE2EEParticipant(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { deviceHash, authUser } = req.context as
      & RequestDeviceHashContext
      & RequestAuthUserContext;
    const dto = req.body as CreateE2EEParticipantRequestDTO;

    const existingE2EEParticipant = await E2EEParticipantRepository
      .getByDeviceId(
        [authUser.id, deviceHash],
      );
    // Deleting any existing e2ee participant associated with the provided device-hash to prevent storage waste
    if (existingE2EEParticipant) {
      await UserRepository.removeE2EEParticipantId(
        authUser.id,
        existingE2EEParticipant.id,
      );
      await E2EEParticipantRepository.delete({
        userId: authUser.id,
        deviceId: deviceHash,
        participantId: existingE2EEParticipant.id,
      });
      await E2EEParticipantOnetimePreKeysRepository.deleteForParticipant([
        authUser.id,
        existingE2EEParticipant.id,
      ]);
    }

    const e2eeParticipant = await E2EEParticipantRepository.create([
      authUser.id,
      deviceHash,
    ], dto);
    await UserRepository.addE2EEParticipantId(authUser.id, e2eeParticipant.id);

    return new JSONResponse(e2eeParticipant, HttpReponseStatus.CREATED);
  }

  static async handleUpdateE2EEParticipantPreKeyBundle(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { authUser, e2eeParticipant } = req.context as
      & RequestAuthUserContext
      & RequestE2EEParticipantContext;
    const dto = req.body as UpdateE2EEParticipantPreKeyBundleRequestDTO;

    const updatedE2EEPartcipant = await E2EEParticipantRepository
      .updatePreKeyBundle(
        [authUser.id, e2eeParticipant.id],
        dto,
      );

    return updatedE2EEPartcipant;
  }
}
