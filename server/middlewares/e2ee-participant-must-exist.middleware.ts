import AppException from "../helpers/app-exception.helper.ts";
import E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type {
  RequestAccessTokenContext,
  RequestE2EEParticipantContext,
} from "@scope/server/types";

export default async function e2eeParticipantMustExist(
  req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  const context = req.context as
    & RequestAccessTokenContext
    & RequestE2EEParticipantContext;

  if (!context.e2eeParticipantId) {
    next(
      new AppException({
        status: HttpReponseStatus.UNAUTHORIZED,
        message:
          "The `e2eeParticipantId` claim is not set in your access token",
      }),
    );
    return;
  }

  const e2eeParticipant = await E2EEParticipantRepository.findById(
    context.e2eeParticipantId,
  );

  if (!e2eeParticipant) {
    next(
      new AppException({
        status: HttpReponseStatus.NOT_FOUND,
        message:
          "Cannot find the e2ee participant that matches the provided `e2eeParticipantId` claim",
      }),
    );
    return;
  }

  context.e2eeParticipant = e2eeParticipant;

  next();
}
