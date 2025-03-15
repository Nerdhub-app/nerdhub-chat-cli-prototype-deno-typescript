import type { UserLoginDTO, UserRegistrationDTO } from "@scope/server/types";
import { cliContext } from "../context.ts";

export function register(dto: UserRegistrationDTO) {
  const registerURL = cliContext.serverURL + "/register";
  return fetch(registerURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Device-Hash": cliContext.deviceId,
    },
    body: JSON.stringify({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
    }),
  });
}

export function login(credentials: UserLoginDTO) {
  const loginURL = cliContext.serverURL + "/login";
  return fetch(loginURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Device-Hash": cliContext.deviceId,
    },
    body: JSON.stringify(credentials),
  });
}

export function getAuthUser() {
  const meURL = cliContext.serverURL + "/me";
  return fetch(meURL, {
    headers: {
      "Authorization": `Bearer ${cliContext.jwt}`,
    },
  });
}
