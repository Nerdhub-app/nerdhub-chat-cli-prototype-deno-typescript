import type {
  UserLoginRequestPayload,
  UserLoginResponsePayload,
  UserRegistrationRequestPayload,
  UserRegistrationResponsePayload,
} from "@scope/server/payload";
import { cliContext } from "../context.ts";
import ApiFetch from "../helpers/api-fetch.helper.ts";

export const AUTH_ENDPOINT = "/auth";

export default class AuthAPI {
  static register(payload: UserRegistrationRequestPayload) {
    const endpoint = AUTH_ENDPOINT + "/register";
    return ApiFetch.post<
      UserRegistrationRequestPayload,
      UserRegistrationResponsePayload
    >(
      endpoint,
      payload,
      {
        deviceHash: cliContext.deviceHash,
      },
    );
  }

  static login(payload: UserLoginRequestPayload) {
    const endpoint = AUTH_ENDPOINT + "/login";
    return ApiFetch.post<UserLoginRequestPayload, UserLoginResponsePayload>(
      endpoint,
      payload,
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
    return ApiFetch.get<UserLoginResponsePayload>(endpoint, {
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
