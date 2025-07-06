import { cliContext } from "../../context.ts";
import { CLIRouter, navigate } from "../../router/index.ts";
import type { RouteRenderer } from "../../router/routes.ts";

export default function requireLocalEncryptionKey<
  TRouteParams extends Record<string, unknown> = Record<string, unknown>,
>(uiRenderer: RouteRenderer<TRouteParams>): RouteRenderer<TRouteParams> {
  return (params?: TRouteParams) => {
    if (!cliContext.localEncryptionKey) {
      navigate({
        name: "LocalKeyManager",
        params: {
          from: CLIRouter.currentRoute.name,
        },
      });
    }
    return uiRenderer(params);
  };
}
