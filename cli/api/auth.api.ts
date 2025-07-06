import type { UserLoginDTO, UserRegistrationDTO } from "@scope/server/types";
import { cliContext } from "../context.ts";
import ApiFetch from "../helpers/api-fetch.helper.ts";
import type {
  UserLoginResponseDTO,
  UserRegistrationResponseDTO,
} from "../cli.d.ts";

export const AUTH_ENDPOINT = "/auth";

export default class AuthAPI {
  static register(dto: UserRegistrationDTO) {
    const endpoint = AUTH_ENDPOINT + "/register";
    return ApiFetch.post<UserRegistrationDTO, UserRegistrationResponseDTO>(
      endpoint,
      dto,
      {
        deviceHash: cliContext.deviceHash,
      },
    );
  }

  static login(credentials: UserLoginDTO) {
    const endpoint = AUTH_ENDPOINT + "/login";
    return ApiFetch.post<UserLoginDTO, UserLoginResponseDTO>(
      endpoint,
      credentials,
      {
        deviceHash: cliContext.deviceHash,
      },
    );
  }

  static getAuthUser() {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot fetch the authenticated user without the context's JWT",
      );
    }
    const endpoint = AUTH_ENDPOINT + "/me";
    return ApiFetch.get<UserLoginResponseDTO>(endpoint, {
      bearerToken: cliContext.jwt,
    });
  }

  static getAccessToken() {
    if (!cliContext.jwt) {
      throw new Error(
        "Cannot get a new access token without the context's JWT",
      );
    }
    const endpoint = AUTH_ENDPOINT + "/access_token";
    return ApiFetch.get<{ access_token: string }>(endpoint, {
      bearerToken: cliContext.jwt,
      deviceHash: cliContext.deviceHash,
    });
  }
}
