import chatsUI from "../ui/chats.ui.ts";
import chatUI from "../ui/chat.ui.ts";
import indexUI from "../ui/index.ui.ts";
import loginUI from "../ui/login.ui.ts";
import registerUI from "../ui/register.ui.ts";
import LocalKeyManagerUI from "../ui/local-key-manager.ui.ts";
import localKeyManagerStoreUI from "../ui/local-key-manager.store.ui.ts";
import localKeyManagerRetrieveUI from "../ui/local-key-manager.retrieve.ui.ts";
import authenticatedRoute from "../ui/middlewares/authenticated-route.middleware.ts";
import requireLocalEncryptionKey from "../ui/middlewares/require-local-encryption-key.middleware.ts";
import setupPreKeyBundle from "../ui/middlewares/setup-prekey-bundle.middleware.ts";

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

export type RouteRenderer<
  TRouteParams extends Record<string, unknown> = Record<string, unknown>,
> = (params?: TRouteParams) => MaybePromise<void>;

export type RouteItem<
  TRouteParams extends Record<string, unknown> = Record<string, unknown>,
> = {
  name: RouteName;
  render: RouteRenderer<TRouteParams>;
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
    render: setupPreKeyBundle(
      authenticatedRoute(
        requireLocalEncryptionKey(() => {
          return chatsUI();
        }),
      ),
    ),
  },
  {
    name: "Chat",
    render: setupPreKeyBundle(
      requireLocalEncryptionKey(authenticatedRoute(() => chatUI())),
    ),
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
