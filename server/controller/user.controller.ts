import type {
  RequestHandlerReturnType,
  RouterRequest,
  RouterResponse,
} from "@scope/core/router";
import type {
  CheckEmailExistsResponseDTO,
  CheckUsernameExistsResponseDTO,
} from "../dtos/user.dto.ts";
import { UnprocessableEntityException } from "../exceptions/unprocessable-entity.exception.ts";
import {
  injectUserRepository,
  type UserRepository,
} from "../repository/user.repository.ts";
import autobind from "../decorators/autobind.decorator.ts";

type CheckUsernameExistsRequestParams = {
  username: string;
};

type CheckEmailExistsQueryParams = {
  email?: string;
};

export class UserController {
  #userRepository!: UserRepository;

  constructor(userRepository: UserRepository) {
    this.#userRepository = userRepository;
  }

  @autobind
  async handleCheckUsernameExists(
    req: RouterRequest<CheckUsernameExistsRequestParams>,
    _res: RouterResponse,
  ): Promise<RequestHandlerReturnType<CheckUsernameExistsResponseDTO>> {
    const { username } = req.params;
    const exists = await this.#userRepository.usernameExists(
      username,
    );
    return { exists, username };
  }

  @autobind
  async handleCheckEmailExists(
    req: RouterRequest<CheckEmailExistsQueryParams>,
    _res: RouterResponse,
  ): Promise<RequestHandlerReturnType<CheckEmailExistsResponseDTO>> {
    const { email } = req.query;
    if (!email) {
      throw new UnprocessableEntityException(
        "The `email` query parameter is required",
      );
    }
    const exists = await this.#userRepository.emailExists(email);
    return { exists, email };
  }
}

// UserController singleton
let userController: UserController;

/**
 * Injects UserController
 * @returns UserController instance
 */
export const injectUserController = () => {
  if (!userController) {
    userController = new UserController(injectUserRepository());
  }
  return userController;
};

export default UserController;
