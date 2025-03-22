import { Confirm, Input, prompt } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import { cliContext } from "../context.ts";
import type { UserRegistrationResponseDTO } from "@scope/server/types";
import { navigate } from "../router/router.ts";
import AuthAPI from "../api/auth.api.ts";
import { bottomActionsUI } from "./common/bottom-action.ui.ts";

export default async function registerUI() {
  let isSuccess = false;

  while (!isSuccess) {
    console.log("Fill the details about you:");
    const prompts = await prompt([
      {
        name: "firstName",
        message: "First name?",
        minLength: 2,
        type: Input,
      },
      {
        name: "lastName",
        message: "Last name?",
        minLength: 2,
        type: Input,
      },
      {
        name: "email",
        message: "Email address?",
        type: Input,
        validate(value) {
          if (value.length === 0) {
            return "The email address is required.";
          }
          if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(value)) {
            return "This is not a valid email address.";
          }
          return true;
        },
      },
      {
        name: "password",
        message: "Password?",
        minLength: 6,
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

    const res = await AuthAPI.register(prompts as Required<typeof prompts>);

    if (!res.ok) {
      console.log(colors.red("Registration failed."));

      const tryAgain = await Confirm.prompt("Do you want to try again?");
      if (tryAgain) continue;
      else navigate({ name: "Index" });
    }

    isSuccess = true;
    const { user, access_token } =
      (await res.json()) as UserRegistrationResponseDTO;

    console.log("User details:");
    console.table(user);
    console.log(`JWT access token: ${colors.green(access_token)}`);

    cliContext.isAuthenticated = true;
    cliContext.user = user;
    cliContext.jwt = access_token;
  }

  await bottomActionsUI();
}
