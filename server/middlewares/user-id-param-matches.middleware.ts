import AppException from "../helpers/app-exception.helper.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type { RequestAuthUserContext } from "../server.d.ts";

export default function userIdRequestParamMatchesAuthUser(
  req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  const { userId } = req.params as { userId: string };
  const { authUser } = req.context as RequestAuthUserContext;

  if (parseInt(userId) !== authUser.id) {
    next(
      new AppException({
        message:
          "The bearer token's authenticated user id does not match the `userId` request parameter",
        status: HttpReponseStatus.FORBIDDEN,
      }),
    );
    return;
  }

  next();
}
