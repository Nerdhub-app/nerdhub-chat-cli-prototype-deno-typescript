import ApiFetch from "../helpers/api-fetch.helper.ts";
import type {
  CheckEmailExistsResponsePayload,
  CheckUsernameExistsResponsePayload,
} from "@scope/server/payload";

export const USERS_ENDPOINT = "/users";

export default class UserAPI {
  static usernameExists(username: string) {
    const endpoint = `${USERS_ENDPOINT}/username/${username}/exists`;
    return ApiFetch.get<CheckUsernameExistsResponsePayload>(endpoint);
  }

  static emailExists(email: string) {
    const endpoint = `${USERS_ENDPOINT}/email/${email}/exists`;
    return ApiFetch.get<CheckEmailExistsResponsePayload>(endpoint);
  }
}
