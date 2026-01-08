import {
  HttpResponseStatus,
  type RouterRequest,
  type RouterResponse,
} from "@scope/core/router";
import type { AccessTokenPayload, RefreshTokenPayload } from "../server.d.ts";
import type UserRepository from "../repository/user.repository.ts";
import {
  type CreateUserRecord,
  injectUserRepository,
} from "../repository/user.repository.ts";
import type E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import {
  injectE2EEParticipantRepository,
} from "../repository/e2ee-participant.repository.ts";
import { createJWT } from "../utils/jwt.utils.ts";
import { hashPassword, verifyPassword } from "../utils/password.utils.ts";
import type {
  GetAuthUserResponseDTO,
  RefreshTokenResponseDTO,
  UserRegistrationRequestDTO,
  UserRegistrationResponseDTO,
  UserSigninRequestDTO,
  UserSigninResponseDTO,
} from "../dtos/auth.dto.ts";
import type { E2EEParticipant, User } from "../database/db.d.ts";
import ForbiddenException from "../exceptions/forbidden.exception.ts";
import { DEVICE_HASH_HEADER_KEY } from "../consts/e2ee.consts.ts";
import {
  ACCESS_TOKEN_LIFETIME,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_LIFETIME,
  REFRESH_TOKEN_SECRET,
} from "../configs/auth.config.ts";
import { connectToKv } from "../kv/kv.connection.ts";
import { KVNamespace } from "../kv/kv.consts.ts";
import type { AuthRouteMiddlewareContext } from "../middlewares/auth-route.middleware.ts";
import autobind from "../decorators/autobind.decorator.ts";

export class AuthController {
  #userRepository!: UserRepository;
  #e2eeParticipantRepository!: E2EEParticipantRepository;
  #kv!: Deno.Kv;

  constructor(
    userRepository: UserRepository,
    e2eeParticipantRepository: E2EEParticipantRepository,
    kv: Deno.Kv,
  ) {
    this.#userRepository = userRepository;
    this.#e2eeParticipantRepository = e2eeParticipantRepository;
    this.#kv = kv;
  }

  @autobind
  async handleSignup(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      unknown,
      UserRegistrationRequestDTO
    >,
    res: RouterResponse<UserRegistrationResponseDTO>,
  ) {
    const dto = req.body;

    const hashedPassword = await hashPassword(dto.password);
    const record: CreateUserRecord = {
      ...dto,
      password: hashedPassword,
    };
    const result = await this.#userRepository.create(record);
    const user = await this.#userRepository.findById(result.insertId) as User;

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id.toString(),
      e2eeParticipantId: null,
    };
    const access_token = await createJWT(
      accessTokenPayload,
      ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_LIFETIME,
    );

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id.toString(),
    };
    const refresh_token = await createJWT(
      refreshTokenPayload,
      REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_LIFETIME,
    );

    return res.setStatus(HttpResponseStatus.CREATED).json({
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        has_e2ee_participant: user.has_e2ee_participant,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      access_token,
      refresh_token,
    });
  }

  @autobind
  async handleSignin(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      unknown,
      UserSigninRequestDTO
    >,
    res: RouterResponse<UserSigninResponseDTO>,
  ) {
    const dto = req.body;
    const user = await this.#userRepository.findByEmail(dto.email);

    const passwordHashMatchesWithProvidedPassword = user
      ? await verifyPassword(user.password, dto.password)
      : false;
    if (!user || !passwordHashMatchesWithProvidedPassword) {
      throw new ForbiddenException(
        "Either your email or your password is wrong",
      );
    }

    let e2eeParticipant: E2EEParticipant | null = null;
    const deviceHash = req._request.headers.get(DEVICE_HASH_HEADER_KEY);
    if (deviceHash) {
      e2eeParticipant = await this.#e2eeParticipantRepository
        .findByUserIdAndDeviceId(
          user.id,
          deviceHash,
        );
    }

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id.toString(),
      e2eeParticipantId: e2eeParticipant?.id ?? null,
    };
    const access_token = await createJWT(
      accessTokenPayload,
      ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_LIFETIME,
    );

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id.toString(),
    };
    const refresh_token = await createJWT(
      refreshTokenPayload,
      REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_LIFETIME,
    );

    return res.setStatus(HttpResponseStatus.OK).json({
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        has_e2ee_participant: user.has_e2ee_participant,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      e2eeParticipant,
      access_token,
      refresh_token,
    });
  }

  @autobind
  async handleRefreshToken(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      AuthRouteMiddlewareContext,
      unknown
    >,
    res: RouterResponse<RefreshTokenResponseDTO>,
  ) {
    const deviceHash = req._request.headers.get(DEVICE_HASH_HEADER_KEY);
    const authUserId = req.context.authUserId!;
    const e2eeParticipant = deviceHash
      ? await this.#e2eeParticipantRepository.findByUserIdAndDeviceId(
        authUserId,
        deviceHash,
      )
      : null;
    const payload: AccessTokenPayload = {
      sub: authUserId.toString(),
      e2eeParticipantId: e2eeParticipant?.id ?? null,
    };
    const access_token = await createJWT(
      payload,
      ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_LIFETIME,
    );
    return res.json({
      access_token,
      refresh_token: req.context.refresh_token!,
    });
  }

  @autobind
  async handleSignout(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      AuthRouteMiddlewareContext,
      unknown
    >,
    res: RouterResponse,
  ) {
    // Blacklisting the refresh token
    const expireIn = Math.max(
      req.context.tokenExpiresAt! - Date.now(),
      0,
    );
    await this.#kv.set(
      [
        KVNamespace.BlackListRefreshToken,
        req.context.refresh_token!,
      ],
      true,
      { expireIn },
    );

    return res.setStatus(HttpResponseStatus.NO_CONTENT).text("Signed out");
  }

  @autobind
  handleGetAuthUser(
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      AuthRouteMiddlewareContext,
      unknown
    >,
    res: RouterResponse<GetAuthUserResponseDTO>,
  ) {
    const { authUser, e2eeParticipant } = req.context;
    return res.json({
      user: {
        id: authUser!.id,
        firstname: authUser!.firstname,
        lastname: authUser!.lastname,
        username: authUser!.username,
        email: authUser!.email,
        has_e2ee_participant: authUser!.has_e2ee_participant,
        created_at: authUser!.created_at,
        updated_at: authUser!.updated_at,
      },
      e2eeParticipant: e2eeParticipant ?? null,
    });
  }
}

// KV connection
const kv = await connectToKv();

// Auth controller singleton
let authController: AuthController;

/**
 * Injects the auth controller
 * @returns The auth controller
 */
export function injectAuthController() {
  if (!authController) {
    authController = new AuthController(
      injectUserRepository(),
      injectE2EEParticipantRepository(),
      kv,
    );
  }
  return authController;
}

export default AuthController;
