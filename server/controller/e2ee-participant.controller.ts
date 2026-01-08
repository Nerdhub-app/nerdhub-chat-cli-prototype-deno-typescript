import {
  HttpResponseStatus,
  type RequestHandlerReturnType,
  type RouterRequest,
  type RouterResponse,
  setHttpResponseStatus,
} from "@scope/core/router";
import {
  type E2EEParticipantRepository,
  injectE2EEParticipantRepository,
} from "../repository/e2ee-participant.repository.ts";
import type { RequireDeviceHashMiddlewareContext } from "../middlewares/require-device-hash.middleware.ts";
import type { AuthRouteMiddlewareContext } from "../middlewares/auth-route.middleware.ts";
import type {
  CreateE2EEParticipantRequestDTO,
  CreateE2EEParticipantResponseDTO,
} from "../dtos/index.d.ts";
import type { E2EEParticipant } from "../database/db.d.ts";
import type {
  UpdateE2EEParticipantPreKeyBundleRequestDTO,
  UpdateE2EEParticipantPreKeyBundleResponseDTO,
} from "../dtos/e2ee-participant.dto.ts";
import {
  authE2EEParticipantMatchesE2EEParticipantIdParam,
  authUserMatchesUserIdParam,
} from "../decorators/auth-ctx-matcher.decorators.ts";
import autobind from "../decorators/autobind.decorator.ts";

export type CreateE2EEParticipantRequestContext =
  RequireDeviceHashMiddlewareContext<AuthRouteMiddlewareContext>;

export type UpdateE2EEParticipantPreKeyBundleRequestContext =
  RequireDeviceHashMiddlewareContext<AuthRouteMiddlewareContext>;

export class E2EEParticipantController {
  #e2eeParticipantRepository!: E2EEParticipantRepository;

  constructor(e2eeParticipantRepository: E2EEParticipantRepository) {
    this.#e2eeParticipantRepository = e2eeParticipantRepository;
  }

  @autobind
  @authUserMatchesUserIdParam()
  @setHttpResponseStatus(HttpResponseStatus.CREATED)
  async handleCreateE2EEParticipant(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      CreateE2EEParticipantRequestContext,
      CreateE2EEParticipantRequestDTO
    >,
    _res: RouterResponse,
  ): Promise<RequestHandlerReturnType<CreateE2EEParticipantResponseDTO>> {
    const { deviceHash, authUser } = req.context;
    const payload = req.body;

    const insertResult = await this.#e2eeParticipantRepository.create(
      authUser!.id,
      deviceHash,
      payload,
    );
    const e2eeParticipant = await this.#e2eeParticipantRepository.findById(
      insertResult.insertId,
    ) as E2EEParticipant;

    return e2eeParticipant;
  }

  @autobind
  @authE2EEParticipantMatchesE2EEParticipantIdParam()
  @authUserMatchesUserIdParam()
  async handleUpdateE2EEParticipantPreKeyBundle(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      UpdateE2EEParticipantPreKeyBundleRequestContext,
      UpdateE2EEParticipantPreKeyBundleRequestDTO
    >,
    _res: RouterResponse,
  ): Promise<
    RequestHandlerReturnType<UpdateE2EEParticipantPreKeyBundleResponseDTO>
  > {
    let { e2eeParticipant } = req.context;
    const payload = req.body;

    await this.#e2eeParticipantRepository.updatePreKeyBundleById(
      e2eeParticipant!.id,
      payload,
    );

    e2eeParticipant = await this
      .#e2eeParticipantRepository.findById(
        e2eeParticipant!.id,
      ) as E2EEParticipant;

    return e2eeParticipant;
  }
}

// E2EEParticipantController singleton
let e2eeParticipantController: E2EEParticipantController;

/**
 * Injects E2EEParticipantController
 * @returns E2EEParticipantController instance
 */
export const injectE2EEParticipantController = () => {
  if (!e2eeParticipantController) {
    e2eeParticipantController = new E2EEParticipantController(
      injectE2EEParticipantRepository(),
    );
  }
  return e2eeParticipantController;
};

export default E2EEParticipantController;
