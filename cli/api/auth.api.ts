import type { UserLoginDTO, UserRegistrationDTO } from "@scope/server/types";
import { cliContext } from "../context.ts";

export default class AuthAPI {
  static register(dto: UserRegistrationDTO) {
    const registerURL = cliContext.serverURL + "/register";
    return fetch(registerURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Device-Hash": cliContext.deviceHash,
      },
      body: JSON.stringify({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: dto.password,
      }),
    });
  }

  static login(credentials: UserLoginDTO) {
    const loginURL = cliContext.serverURL + "/login";
    return fetch(loginURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Device-Hash": cliContext.deviceHash,
      },
      body: JSON.stringify(credentials),
    });
  }

  static getAuthUser() {
    const meURL = cliContext.serverURL + "/me";
    return fetch(meURL, {
      headers: {
        "Authorization": `Bearer ${cliContext.jwt}`,
      },
    });
  }
}
