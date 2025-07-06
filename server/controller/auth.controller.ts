import type {
  AccessTokenPayload,
  E2EEParticipant,
  RequestAccessTokenContext,
  RequestAuthUserContext,
  UserLoginDTO,
  UserLoginResponseDTO,
  UserRegistrationDTO,
  UserRegistrationResponseDTO,
} from "../server.d.ts";
import UserRepository from "../repository/user.repository.ts";
import E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import { createJWT } from "../utils/jwt.utils.ts";
import { verifyPassword } from "../utils/password.utils.ts";
import {
  HttpReponseStatus,
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import AppException from "../helpers/app-exception.helper.ts";

export default class AuthController {
  static async handleRegistration(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const dto = await req.body as UserRegistrationDTO;
    const user = await UserRepository.create(dto);

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      e2eeParticipantId: null,
    };
    const access_token = await createJWT(accessTokenPayload);

    const resBody: UserRegistrationResponseDTO = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      access_token,
    };
    return new JSONResponse(resBody, HttpReponseStatus.CREATED);
  }

  static async handleLogin(req: MiddlewareRequest, next: MiddlewareNextFn) {
    const dto = await req.body as UserLoginDTO;
    const user = await UserRepository.getByEmail(dto.email);

    if (!user || !(await verifyPassword(user.password, dto.password))) {
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
      e2eeParticipant = await E2EEParticipantRepository.getByDeviceId([
        user.id,
        deviceHash,
      ]);
    }

    const access_token = await createJWT<AccessTokenPayload>({
      sub: user.id,
      e2eeParticipantId: e2eeParticipant?.id ?? null,
    });

    const resBody: UserLoginResponseDTO = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      e2eeParticipant: e2eeParticipant
        ? {
          id: e2eeParticipant.id,
          userId: e2eeParticipant.userId,
          deviceId: e2eeParticipant.deviceId,
          pubIdentityKey: e2eeParticipant.pubIdentityKey,
          pubSignedPreKey: e2eeParticipant.pubSignedPreKey,
          signedPreKeySignature: e2eeParticipant.signedPreKeySignature,
          createdAt: e2eeParticipant.createdAt,
          updatedAt: e2eeParticipant.updatedAt,
        }
        : null,
      access_token,
    };
    return resBody;
  }

  static handleGetAuthUser(
    req: MiddlewareRequest,
    _next: MiddlewareNextFn,
  ) {
    const { authUser, e2eeParticipant, access_token } = req.context as
      & RequestAccessTokenContext
      & RequestAuthUserContext;
    const resBody: UserLoginResponseDTO = {
      user: {
        id: authUser.id,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        email: authUser.email,
        createdAt: authUser.createdAt,
        updatedAt: authUser.updatedAt,
      },
      e2eeParticipant: e2eeParticipant
        ? {
          id: e2eeParticipant.id,
          userId: e2eeParticipant.userId,
          deviceId: e2eeParticipant.deviceId,
          pubIdentityKey: e2eeParticipant.pubIdentityKey,
          pubSignedPreKey: e2eeParticipant.pubSignedPreKey,
          signedPreKeySignature: e2eeParticipant.signedPreKeySignature,
          createdAt: e2eeParticipant.createdAt,
          updatedAt: e2eeParticipant.updatedAt,
        }
        : null,
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
      e2eeParticipant = await E2EEParticipantRepository.getByDeviceId(
        [authUser.id, deviceHash],
      );
    }

    const access_token = await createJWT<AccessTokenPayload>({
      sub: authUser.id,
      e2eeParticipantId: e2eeParticipant?.id ?? null,
    });

    return { access_token };
  }

  static async handleE2EEParticipantRegistration() {}
}
