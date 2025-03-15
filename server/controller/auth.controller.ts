import type {
  AccessTokenPayload,
  UserLoginDTO,
  UserLoginResponseDTO,
  UserRegistrationDTO,
  UserRegistrationResponseDTO,
} from "../server.d.ts";
import * as UserRepository from "../repository/user.repository.ts";
import * as E2EEParticipantRepository from "../repository/e2ee-participant.repository.ts";
import { createJWT } from "../utils/jwt.utils.ts";
import { verifyPassword } from "../utils/password.utils.ts";
import {
  BearerTokenError,
  handleBearerToken,
} from "../middlewares/bearer-token.middleware.ts";

export default class AuthController {
  static async handleRegistration(req: Request) {
    const dto = await req.json() as UserRegistrationDTO;
    const user = await UserRepository.create(dto);

    const deviceHash = req.headers.get("Device-Hash");
    if (!deviceHash) {
      return new Response(
        JSON.stringify({ message: "`Device-Hash` headers is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
    const e2eeParticipant = await E2EEParticipantRepository.create({
      userId: user.id,
      deviceId: deviceHash,
    });

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      e2eeParticipantId: e2eeParticipant.id,
    };
    const access_token = await createJWT(accessTokenPayload);

    const res: UserRegistrationResponseDTO = {
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

    return new Response(JSON.stringify(res), {
      status: 201,
    });
  }

  static async handleLogin(req: Request) {
    const dto = await req.json() as UserLoginDTO;

    const user = await UserRepository.getByEmail(dto.email);

    if (!user || !(await verifyPassword(user.password, dto.password))) {
      return new Response(
        JSON.stringify({ message: "Your email or password is wrong" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const deviceHash = req.headers.get("Device-Hash");
    if (!deviceHash) {
      return new Response(
        JSON.stringify({ message: "`Device-Hash` headers is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    let e2eeParticipant = await E2EEParticipantRepository.getByDeviceId(
      user.id,
      deviceHash,
    );
    if (!e2eeParticipant) {
      e2eeParticipant = await E2EEParticipantRepository.create({
        userId: user.id,
        deviceId: deviceHash,
      });
    }

    const access_token = await createJWT<AccessTokenPayload>({
      sub: user.id,
      e2eeParticipantId: e2eeParticipant.id,
    });

    const body: UserLoginResponseDTO = {
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
    return new Response(JSON.stringify(body));
  }

  static async handleGetAuthUser(req: Request) {
    try {
      const { payload, access_token } = await handleBearerToken(req);
      const user = await UserRepository.getById(payload.sub as string);

      if (!user) {
        return new Response(
          JSON.stringify({ message: "The authenticated user is not found" }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const body: UserLoginResponseDTO = {
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
      return new Response(JSON.stringify(body), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error instanceof BearerTokenError) {
        return new Response(JSON.stringify({ message: error.message }), {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      throw error;
    }
  }
}
