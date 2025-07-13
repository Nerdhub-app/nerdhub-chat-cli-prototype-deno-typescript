import UserRepository from "../repository/user.repository.ts";
import type { MiddlewareNextFn, MiddlewareRequest } from "../router.ts";
import type { CheckUsernameExistsResponsePayload } from "@scope/server/payload";

type CheckUsernameExistsRequestParams = {
  username: string;
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
}
