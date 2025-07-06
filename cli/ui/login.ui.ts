import { Confirm, Input, Select } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import AuthAPI from "../api/auth.api.ts";
import { cliContext } from "../context.ts";
import { navigate } from "../router/router.ts";
import type { LocalManagerUIParams } from "./local-key-manager.ui.ts";
import type { RegisterRouteParams } from "./register.ui.ts";
import { WrappedFetchResponseError } from "../helpers/api-fetch.helper.ts";

export type LoginRouteParams = {
  from?: `Chats${string}`;
};

export default async function loginUI(params?: LoginRouteParams) {
  const proceedToLogin = await Select.prompt<boolean>({
    message: "Before proceeding to login, do already have an account?",
    options: [
      { name: "Yes, proceed to login", value: true },
      { name: "No, I want to register for a new account", value: false },
    ],
  });
  if (!proceedToLogin) {
    navigate<RegisterRouteParams>({
      name: "Register",
      params: { from: params?.from },
    });
  }

  console.log("Enter your login credentials:");

  let isSuccess = false;
  while (!isSuccess) {
    const email = await Input.prompt({
      message: "Email?",
    }) as string;
    const password = await Input.prompt({
      message: "Password?",
    }) as string;

    let res: Awaited<ReturnType<typeof AuthAPI.login>>;
    try {
      res = await AuthAPI.login({ email, password });
    } catch (e) {
      if (e instanceof WrappedFetchResponseError) {
        const error = e as WrappedFetchResponseError<{ message: string }>;
        const { message } = error.bodyJSON;
        console.log(colors.red(`Login failed: ${message}`));

        const tryAgain = await Confirm.prompt("Do you want to try again?");
        if (tryAgain) continue;
        else {
          navigate({ name: "Index" });
          return;
        }
      } else throw e;
    }

    isSuccess = true;

    const body = res.bodyJSON;

    console.log("User details:");
    console.table(body.user);
    console.log(`JWT access token: ${colors.green(body.access_token)}`);

    cliContext.isAuthenticated = true;
    cliContext.user = body.user;
    cliContext.e2eeParticipant = body.e2eeParticipant;
    cliContext.jwt = body.access_token;
  }

  navigate<LocalManagerUIParams>({
    name: "LocalKeyManager",
    params: {
      from: params?.from,
    },
  });
}
