import {
  BodyParseError,
  injectRouterRequestFactory,
  type RouterRequestFactory,
  UnsupportedMediaTypeError,
} from "./router-request.factory.ts";
import { ConcreteRouterResponse } from "./router-response.ts";
import type { AppRouter } from "./router.core.d.ts";
import ConcreteRouter from "./router.ts";

export default class ConcreteAppRouter extends ConcreteRouter
  implements AppRouter {
  #routerRequestFactory!: RouterRequestFactory;

  constructor(routerRequestFactory: RouterRequestFactory) {
    super();
    this.#routerRequestFactory = routerRequestFactory;
  }

  async handleDenoRequest(request: Request): Promise<Response> {
    try {
      const routerRequest = await this.#routerRequestFactory
        .createFromDenoRequest(request);
      const routerResponse = new ConcreteRouterResponse();

      const handlersResponse = await this.channelRequestThroughRequestHandlers(
        routerRequest,
        routerResponse,
      );
      if (typeof handlersResponse === "undefined") {
        const message =
          `Cannot ${routerRequest.method} /${routerRequest.reqPathname}`;
        return new Response(message, {
          status: 404,
          headers: {
            "Content-Type": "application/text",
          },
        });
      } else if (handlersResponse instanceof ConcreteRouterResponse) {
        return handlersResponse.toDenoResponse();
      } else if (handlersResponse instanceof Response) {
        return handlersResponse;
      } else if (typeof handlersResponse === "object") {
        return new Response(JSON.stringify(handlersResponse), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      } else {
        return new Response(handlersResponse?.toString() ?? "", {
          status: 200,
          headers: {
            "Content-Type": "application/text",
          },
        });
      }
    } catch (error) { // Router request creation error handling
      if (error instanceof BodyParseError) {
        return new Response(error.message, {
          status: 400,
          headers: {
            "Content-Type": "application/text",
          },
        });
      } else if (error instanceof UnsupportedMediaTypeError) {
        return new Response(error.message, {
          status: 415,
          headers: {
            "Content-Type": "application/text",
          },
        });
      } else {
        return new Response("Internal server error", {
          status: 500,
          headers: {
            "Content-Type": "application/text",
          },
        });
      }
    }
  }
}

/**
 * Creates a new app router.
 * @returns The new app router.
 */
export function createAppRouter(): AppRouter {
  return new ConcreteAppRouter(injectRouterRequestFactory());
}
