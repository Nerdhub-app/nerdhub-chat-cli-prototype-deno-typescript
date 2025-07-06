import AppException from "../helpers/app-exception.helper.ts";
import E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import UserRepository from "../repository/user.repository.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type {
  RequestAccessTokenContext,
  RequestAuthUserContext,
} from "../server.d.ts";

export default async function authUserMustExist(
  req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  const { authUserId, e2eeParticipantId } = req.context as
    & RequestAccessTokenContext
    & RequestAuthUserContext;
  const user = await UserRepository.getById(authUserId);

  if (!user) {
    next(
      new AppException({
        message: "Cannot find user that matches the provided bearer token",
        status: HttpReponseStatus.NOT_FOUND,
      }),
    );
    return;
  }

  req.context.authUser = user;

  if (e2eeParticipantId) {
    const e2eeParticipant = await E2EEParticipantRepository.getById(
      [authUserId, e2eeParticipantId],
    );

    if (!e2eeParticipant) {
      next(
        new AppException({
          message:
            "Cannot find e2ee participant that matches the provided bearer token",
          status: HttpReponseStatus.NOT_FOUND,
        }),
      );
      return;
    }

    req.context.e2eeParticipant = e2eeParticipant;
  }

  next();
}
