import {
  HttpResponseStatus,
  type RequestHandlerReturnType,
  type RouterRequest,
  type RouterResponse,
  setHttpResponseStatus,
} from "@scope/core/router";
import {
  type E2EEParticipantOnetimePreKeyRepository,
  injectE2EEParticipantOnetimePreKeyRepository,
} from "../repository/e2ee-participant-onetime-prekey.repository.ts";
import type { AuthRouteMiddlewareContext } from "../middlewares/auth-route.middleware.ts";
import type {
  CreateManyOnetimePreKeysRequestDTO,
  CreateManyOnetimePreKeysResponseDTO,
} from "../dtos/index.d.ts";
import {
  authE2EEParticipantMatchesE2EEParticipantIdParam,
  authUserMatchesUserIdParam,
} from "../decorators/auth-ctx-matcher.decorators.ts";
import autobind from "../decorators/autobind.decorator.ts";
import type { RequireDeviceHashMiddlewareContext } from "../middlewares/require-device-hash.middleware.ts";

type CreateManyOnetimePreKeysRequestQuery = {
  flush?: string;
};

export class E2EEParticipantOnetimePreKeyController {
  #e2eeParticipantOnetimePreKeyRepository!:
    E2EEParticipantOnetimePreKeyRepository;

  constructor(
    e2eeParticipantOnetimePreKeyRepository:
      E2EEParticipantOnetimePreKeyRepository,
  ) {
    this.#e2eeParticipantOnetimePreKeyRepository =
      e2eeParticipantOnetimePreKeyRepository;
  }

  @autobind
  @authE2EEParticipantMatchesE2EEParticipantIdParam()
  @authUserMatchesUserIdParam()
  @setHttpResponseStatus(HttpResponseStatus.CREATED)
  async handleCreateManyOnetimePreKeys(
    req: RouterRequest<
      Record<string, unknown>,
      CreateManyOnetimePreKeysRequestQuery,
      RequireDeviceHashMiddlewareContext<AuthRouteMiddlewareContext>,
      CreateManyOnetimePreKeysRequestDTO
    >,
    _res: RouterResponse,
  ): Promise<RequestHandlerReturnType<CreateManyOnetimePreKeysResponseDTO>> {
    const { e2eeParticipant } = req.context;
    const payload = req.body;
    const { flush } = req.query;

    await this.#e2eeParticipantOnetimePreKeyRepository
      .createManyByParticipantId(
        e2eeParticipant!.id,
        payload,
        !!flush,
      );

    const onetimePreKeys = await this
      .#e2eeParticipantOnetimePreKeyRepository
      .findManyByParticipantId(e2eeParticipant!.id);

    return onetimePreKeys;
  }
}

// E2EEParticipantOnetimePreKeyController singleton
let e2eeParticipantOnetimePreKeyController:
  E2EEParticipantOnetimePreKeyController;

/**
 * Injects E2EEParticipantOnetimePreKeyController
 * @returns E2EEParticipantOnetimePreKeyController instance
 */
export const injectE2EEParticipantOnetimePreKeyController = () => {
  if (!e2eeParticipantOnetimePreKeyController) {
    e2eeParticipantOnetimePreKeyController =
      new E2EEParticipantOnetimePreKeyController(
        injectE2EEParticipantOnetimePreKeyRepository(),
      );
  }
  return e2eeParticipantOnetimePreKeyController;
};

export default E2EEParticipantOnetimePreKeyController;
