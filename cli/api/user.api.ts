import ApiFetch from "../helpers/api-fetch.helper.ts";
import type { UsernameExistsResponsePayload } from "@scope/server/payload";

export const USERS_ENDPOINT = "/users";

export default class UserAPI {
  static usernameExists(username: string) {
    const endpoint = `${USERS_ENDPOINT}/username/${username}/exists`;
    return ApiFetch.get<UsernameExistsResponsePayload>(endpoint);
  }
}
