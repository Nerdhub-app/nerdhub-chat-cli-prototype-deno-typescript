import { Confirm, Input, prompt } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import { keypress } from "@cliffy/keypress";
import { cliContext } from "../context.ts";
import { navigate } from "../router/router.ts";
import AuthAPI from "../api/auth.api.ts";
import type { LocalManagerUIParams } from "./local-key-manager.ui.ts";

import UserAPI from "../api/user.api.ts";

export type RegisterRouteParams = {
  from?: `Chats${string}`;
};

export default async function registerUI(params?: RegisterRouteParams) {
  let isSuccess = false;

  while (!isSuccess) {
    console.log("Fill the details about you:");
    const prompts = await prompt([
      {
        name: "firstname",
        message: "First name",
        minLength: 1,
        type: Input,
      },
      {
        name: "lastname",
        message: "Last name",
        minLength: 1,
        type: Input,
      },
      {
        name: "username",
        message: "Username",
        minLength: 1,
        type: Input,
        async validate(value) {
          if (value.length === 0) {
            return "The username is required.";
          }
          const usernamePattern = /^[a-zA-Z0-9]+$/;
          if (!value.match(usernamePattern)) {
            return "The username must contain alphanumeric characters";
          }
          try {
            const { bodyJSON } = await UserAPI.usernameExists(value);
            if (bodyJSON.usernameExists) {
              return `The username '${value}' is already taken.`;
            }
          } catch (error) {
            console.log(error);
          }
          return true;
        },
      },
      {
        name: "email",
        message: "Email address",
        minLength: 1,
        type: Input,
        async validate(value) {
          if (value.length === 0) {
            return "The email address is required.";
          }
          if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(value)) {
            return "This is not a valid email address.";
          }
          const { bodyJSON } = await UserAPI.emailExists(value);
          if (bodyJSON.emailExists) {
            return `The email '${value}' is already taken.`;
          }
          return true;
        },
      },
      {
        name: "password",
        message: "Password?",
        minLength: 8,
        type: Input,
      },
      {
        name: "passwordConfirmation",
        message: "Confirm your password.",
        type: Input,
      },
    ]);
    let passwordConfirmation = prompts.passwordConfirmation;
    while (prompts.password !== passwordConfirmation) {
      console.log(colors.red("Password confirmation failed."));
      passwordConfirmation = await Input.prompt({
        message: "Confirm your password again.",
      });
    }
    prompts.passwordConfirmation = passwordConfirmation;

    let res: Awaited<ReturnType<typeof AuthAPI.register>>;
    try {
      res = await AuthAPI.register(prompts as Required<typeof prompts>);
    } catch (_) {
      console.log(colors.red("Registration failed."));

      const tryAgain = await Confirm.prompt("Do you want to try again?");
      if (tryAgain) continue;
      else {
        navigate({ name: "Index" });
        return;
      }
    }

    isSuccess = true;
    const { user, access_token } = res.bodyJSON;

    console.log("User details:");
    console.table(user);
    console.log(`JWT access token: ${colors.green(access_token)}`);

    console.log();
    console.log("Press any key to continue ...");
    await keypress();

    cliContext.isAuthenticated = true;
    cliContext.user = user;
    cliContext.jwt = access_token;
  }

  navigate<LocalManagerUIParams>({
    name: "LocalKeyManager",
    params: {
      from: params?.from,
    },
  });
}
