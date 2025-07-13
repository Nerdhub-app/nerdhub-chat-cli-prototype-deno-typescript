import AppException from "../helpers/app-exception.helper.ts";
import UserRepository from "../repository/user.repository.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type {
  CheckEmailExistsResponsePayload,
  CheckUsernameExistsResponsePayload,
} from "@scope/server/payload";

type CheckUsernameExistsRequestParams = {
  username: string;
};

type CheckEmailExistsQueryParams = {
  email?: string;
};

export default class UserController {
  static async handleCheckUsernameExists(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { username } = req.params as CheckUsernameExistsRequestParams;
    const usernameExists = await UserRepository.usernameExists(username);
    const resBody: CheckUsernameExistsResponsePayload = { usernameExists };
    return resBody;
  }

  static async handleCheckEmailExists(
    req: MiddlewareRequest,
    next: MiddlewareNextFn,
  ) {
    const { email } = req.query as CheckEmailExistsQueryParams;

    if (!email) {
      next(
        new AppException({
          status: HttpReponseStatus.UNPROCESSABLE_ENTITY,
          message: "The `email` query parameter is required",
        }),
      );
      return;
    }

    const emailExists = await UserRepository.emailExists(email);

    const resBody: CheckEmailExistsResponsePayload = { emailExists };
    return resBody;
  }
}
