import {
  BodyParseError,
  injectRouterRequestFactory,
  type RouterRequestFactory,
  UnsupportedMediaTypeError,
} from "./router-request.factory.ts";
import { ConcreteRouterResponse } from "./router-response.ts";
import type { AppRouter } from "./router.core.d.ts";
import ConcreteRouter, {
  UnmatchedRequestThroughEntriesError,
} from "./router.ts";
import {
  DEFAULT_UNRETURNED_REQUEST_TIMEOUT,
  HttpResponseStatus,
} from "./router.core.const.ts";

export default class ConcreteAppRouter extends ConcreteRouter
  implements AppRouter {
  #routerRequestFactory!: RouterRequestFactory;

  /**
   * The request timeout in milliseconds.
   */
  #requestTimeout!: number;

  /**
   * Whether to return the stack of internal server errors.
   */
  #returnErrorStack!: boolean;

  constructor(
    routerRequestFactory: RouterRequestFactory,
    config?: AppRouterConfig,
  ) {
    super();
    this.#routerRequestFactory = routerRequestFactory;
    this.#requestTimeout = config?.unreturnedRequestTimeout ??
      DEFAULT_UNRETURNED_REQUEST_TIMEOUT;
    this.#returnErrorStack = config?.returnErrorStack ?? true;

    // Binding the `handleDenoRequest` method to the instance
    this.handleDenoRequest = this.handleDenoRequest.bind(this);
  }

  async handleDenoRequest(request: Request): Promise<Response> {
    try {
      const routerRequest = await this.#routerRequestFactory
        .createFromDenoRequest(request);
      const routerResponse = new ConcreteRouterResponse();

      const {
        requestHandlerReturnValue: handlersResponse,
        requestHandlerHttpResponseStatus,
      } = await this.channelRequestThroughRequestHandlers(
        routerRequest,
        routerResponse,
      );
      // If the request takes too long to be processed, return a timeout response
      if (typeof handlersResponse === "undefined") {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, this.#requestTimeout);
          // Clearing the timeout if the request is aborted
          request.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          });
        });
        return new Response(
          `Request took too long to be processed.\nTimeout of ${this.#requestTimeout}ms exceeded.`,
          {
            status: HttpResponseStatus.TIMEOUT,
            headers: {
              "Content-Type": "application/text",
            },
          },
        );
      } else if (handlersResponse instanceof ConcreteRouterResponse) {
        return handlersResponse.toDenoResponse();
      } else if (handlersResponse instanceof Response) {
        return handlersResponse;
      } else if (typeof handlersResponse === "object") {
        return new Response(JSON.stringify(handlersResponse), {
          status: requestHandlerHttpResponseStatus ?? HttpResponseStatus.OK,
          headers: {
            "Content-Type": "application/json",
          },
        });
      } else {
        return new Response(handlersResponse?.toString() ?? "", {
          status: requestHandlerHttpResponseStatus ?? HttpResponseStatus.OK,
          headers: {
            "Content-Type": "application/text",
          },
        });
      }
    } catch (error) {
      // Body parse error handling
      if (error instanceof BodyParseError) {
        return new Response(error.message, {
          status: HttpResponseStatus.BAD_REQUEST,
          headers: {
            "Content-Type": "application/text",
          },
        });
      } // Unsupported media type error handling
      else if (error instanceof UnsupportedMediaTypeError) {
        return new Response(error.message, {
          status: HttpResponseStatus.UNSUPPORTED_MEDIA_TYPE,
          headers: {
            "Content-Type": "application/text",
          },
        });
      } // Unmatched request through entries error handling
      else if (error instanceof UnmatchedRequestThroughEntriesError) {
        const message =
          `Cannot ${error.request.method} ${error.request.reqPathname}`;
        return new Response(message, {
          status: HttpResponseStatus.NOT_FOUND,
          headers: {
            "Content-Type": "application/text",
          },
        });
      } // Internal server error handling
      else {
        let resBody: string = "Internal server error";
        if (this.#returnErrorStack && error instanceof Error && error.stack) {
          resBody += "\n" + error.stack;
        }
        return new Response(
          resBody,
          {
            status: HttpResponseStatus.INTERNAL_SERVER_ERROR,
            headers: {
              "Content-Type": "application/text",
            },
          },
        );
      }
    }
  }
}

/**
 * Configuration for the app router.
 */
export type AppRouterConfig = {
  /**
   * The request timeout in milliseconds.
   */
  unreturnedRequestTimeout?: number;
  /**
   * Whether to return the stack of internal server errors.
   */
  returnErrorStack?: boolean;
};

/**
 * Creates a new app router.
 * @returns The new app router.
 */
export function createAppRouter(config?: AppRouterConfig): AppRouter {
  return new ConcreteAppRouter(
    injectRouterRequestFactory(),
    config,
  );
}
