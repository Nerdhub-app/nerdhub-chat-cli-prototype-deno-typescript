import UserRepository from "../repository/user.repository.ts";
import type { MiddlewareNextFn, MiddlewareRequest } from "../router.ts";
import type {
  CheckEmailExistsResponsePayload,
  CheckUsernameExistsResponsePayload,
} from "@scope/server/payload";

type CheckUsernameExistsRequestParams = {
  username: string;
};

type CheckEmailExistsRequestParams = {
  email: string;
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
    _next: MiddlewareNextFn,
  ) {
    const { email } = req.params as CheckEmailExistsRequestParams;
    const emailExists = await UserRepository.usernameExists(email);
    const resBody: CheckEmailExistsResponsePayload = { emailExists };
    return resBody;
  }
}
