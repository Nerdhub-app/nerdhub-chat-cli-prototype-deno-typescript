import { type RouteName, routes } from "./routes.ts";

export type CurrentRouteData = {
  name: RouteName;
  params?: Record<string, string>;
};

export class RouterNavigationError extends Error {}

export class CLIRouter {
  static routesMap = new Map(routes.map((route) => [route.name, route]));

  static #currentRoute: CurrentRouteData;
  static get currentRoute() {
    return CLIRouter.#currentRoute;
  }
  static set currentRoute(routeData: CurrentRouteData) {
    CLIRouter.#currentRoute = routeData;
    this.renderUI(routeData);
  }

  private static async renderUI(routeData: CurrentRouteData) {
    const route = CLIRouter.routesMap.get(routeData.name);
    if (!route) {
      throw new Error(`Route ${routeData.name} not found`);
    }
    try {
      await route.render(routeData.params);
    } catch (error) {
      if (!(error instanceof RouterNavigationError)) {
        throw error;
      }
    }
  }

  static async init(routeData: CurrentRouteData) {
    await CLIRouter.renderUI(routeData);
  }
}

export function navigate(routeData: CurrentRouteData) {
  console.clear();
  CLIRouter.currentRoute = routeData;
  throw new RouterNavigationError();
}
