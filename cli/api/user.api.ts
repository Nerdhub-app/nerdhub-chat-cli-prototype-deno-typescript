import ApiFetch from "../helpers/api-fetch.helper.ts";
import type {
  CheckEmailExistsResponsePayload,
  CheckUsernameExistsResponsePayload,
} from "@scope/server/payload";

export const USERS_ENDPOINT = "/users";

export default class UserAPI {
  static usernameExists(username: string) {
    const encodedUsername = encodeURIComponent(username);
    console.log("encodedUsername", encodedUsername);
    const endpoint = `${USERS_ENDPOINT}/username/${encodedUsername}/exists`;
    return ApiFetch.get<CheckUsernameExistsResponsePayload>(endpoint);
  }

  static emailExists(email: string) {
    const endpoint = `${USERS_ENDPOINT}/email/exists?email=${email}`;
    return ApiFetch.get<CheckEmailExistsResponsePayload>(endpoint);
  }
}
