import chatsUI from "../ui/chats.ui.ts";
import chatUI from "../ui/chat.ui.ts";
import indexUI from "../ui/index.ui.ts";
import loginUI from "../ui/login.ui.ts";
import registerUI from "../ui/register.ui.ts";

export type RouteName =
  | "Index"
  | "Register"
  | "Login"
  | "Chats"
  | "Chat"
  | "Exit";

type MaybePromise<T> = void | Promise<T>;

export type RouteItem = {
  name: RouteName;
  params?: string[];
  render: (params?: Record<string, string>) => MaybePromise<void>;
};

export const routes: RouteItem[] = [
  {
    name: "Index",
    render: () => indexUI(),
  },
  {
    name: "Register",
    render: () => registerUI(),
  },
  {
    name: "Login",
    render: () => loginUI(),
  },
  {
    name: "Chats",
    render: () => chatsUI(),
  },
  {
    name: "Chat",
    params: ["chatId"],
    render: () => chatUI(),
  },
  {
    name: "Exit",
    render: () => Deno.exit(),
  },
];
