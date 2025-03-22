import chatsUI from "../ui/chats.ui.ts";
import chatUI from "../ui/chat.ui.ts";
import indexUI from "../ui/index.ui.ts";
import loginUI from "../ui/login.ui.ts";
import registerUI from "../ui/register.ui.ts";
import LocalKeyManagerUI from "../ui/local-key-manager.ui.ts";
import localKeyManagerStoreUI from "../ui/local-key-manager.store.ui.ts";
import localKeyManagerRetrieveUI from "../ui/local-key-manager.retrieve.ui.ts";

export type RouteName =
  | "Index"
  | "Register"
  | "Login"
  | "Chats"
  | "Chat"
  | "LocalKeyManager"
  | "LocalKeyManager.Store"
  | "LocalKeyManager.Retrieve"
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
    render: () => chatUI(),
  },
  {
    name: "LocalKeyManager",
    render: (params) => LocalKeyManagerUI(params),
  },
  {
    name: "LocalKeyManager.Store",
    render: (params) => localKeyManagerStoreUI(params),
  },
  {
    name: "LocalKeyManager.Retrieve",
    render: (params) => localKeyManagerRetrieveUI(params),
  },
  {
    name: "Exit",
    render: () => Deno.exit(),
  },
];
