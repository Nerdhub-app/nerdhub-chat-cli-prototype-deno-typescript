import AppException from "../helpers/app-exception.helper.ts";
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
  const { authUserId } = req.context as
    & RequestAccessTokenContext
    & RequestAuthUserContext;
  const user = await UserRepository.findById(authUserId);

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

  next();
}
