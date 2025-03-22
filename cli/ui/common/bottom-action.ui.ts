import { Select } from "@cliffy/prompt";
import { navigate } from "../../router/router.ts";

export type BottomActions = "MainMenu" | "Exit";

export async function bottomActionsUI<TExtra extends string = string>(
  extra: { value: TExtra; name: string }[] = [],
) {
  console.log("");
  const action = await Select.prompt<
    BottomActions | TExtra
  >({
    message: "Actions?",
    options: [
      ...extra,
      { name: "Go to main menu", value: "MainMenu" },
      { name: "Exit", value: "Exit" },
    ],
  }) as BottomActions | TExtra;
  if (action === "MainMenu") navigate({ name: "Index" });
  else if (action === "Exit") Deno.exit();
  return action;
}
