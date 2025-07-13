import type {
  AccessTokenPayload,
  E2EEParticipant,
  RequestAccessTokenContext,
  RequestAuthUserContext,
  User,
} from "../server.d.ts";
import UserRepository, {
  type CreateUserDTO,
} from "../repository/user.repository.ts";
import E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import { createJWT } from "../utils/jwt.utils.ts";
import { hashPassword, verifyPassword } from "../utils/password.utils.ts";
import {
  HttpReponseStatus,
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import AppException from "../helpers/app-exception.helper.ts";
import type {
  UserLoginRequestPayload,
  UserLoginResponsePayload,
  UserRegistrationRequestPayload,
  UserRegistrationResponsePayload,
} from "@scope/server/payload";

export default class AuthController {
  static async handleRegistration(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const payload = await req.body as UserRegistrationRequestPayload;

    const dto: CreateUserDTO = {
      ...payload,
      password: await hashPassword(payload.password),
    };
    const result = await UserRepository.create(dto);
    const user = await UserRepository.findById(result.insertId) as User;

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id.toString(),
      e2eeParticipantId: null,
    };
    const access_token = await createJWT(accessTokenPayload);

    const resBody: UserRegistrationResponsePayload = {
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
    };
    return new JSONResponse(resBody, HttpReponseStatus.CREATED);
  }

  static async handleLogin(req: MiddlewareRequest, next: MiddlewareNextFn) {
    const payload = await req.body as UserLoginRequestPayload;
    const user = await UserRepository.findByEmail(payload.email);

    if (!user || !(await verifyPassword(user.password, payload.password))) {
      next(
        new AppException({
          message: "Either your email or your password is wrong",
          status: HttpReponseStatus.UNAUTHORIZED,
        }),
      );
      return;
    }

    let e2eeParticipant: E2EEParticipant | null = null;
    const deviceHash = req.request.headers.get("X-Device-Hash");
    if (deviceHash) {
      e2eeParticipant = await E2EEParticipantRepository.findByUserIdAndDeviceId(
        user.id,
        deviceHash,
      );
    }

    const access_token = await createJWT<AccessTokenPayload>({
      sub: user.id.toString(),
      e2eeParticipantId: e2eeParticipant?.id ?? null,
    });

    const resBody: UserLoginResponsePayload = {
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
    };
    return resBody;
  }

  static async handleGetAuthUser(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { authUser, access_token, e2eeParticipantId } = req.context as
      & RequestAccessTokenContext
      & RequestAuthUserContext;

    const e2eeParticipant = e2eeParticipantId
      ? await E2EEParticipantRepository.findById(e2eeParticipantId)
      : null;

    const resBody: UserLoginResponsePayload = {
      user: {
        id: authUser.id,
        firstname: authUser.firstname,
        lastname: authUser.lastname,
        username: authUser.username,
        email: authUser.email,
        has_e2ee_participant: authUser.has_e2ee_participant,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
      },
      e2eeParticipant,
      access_token,
    };
    return resBody;
  }

  static async handleGetAccessToken(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { authUser } = req.context as (RequestAuthUserContext);

    let e2eeParticipant: E2EEParticipant | null = null;
    const deviceHash = req.request.headers.get("X-Device-Hash");
    if (deviceHash) {
      e2eeParticipant = await E2EEParticipantRepository.findByUserIdAndDeviceId(
        authUser.id,
        deviceHash,
      );
    }

    const access_token = await createJWT<AccessTokenPayload>({
      sub: authUser.id.toString(),
      e2eeParticipantId: e2eeParticipant?.id ?? null,
    });

    return { access_token };
  }
}
