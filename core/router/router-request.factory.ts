import ConcreteRouterRequest from "./router-request.ts";

export class RouterRequestFactory {
  async createFromDenoRequest<
    TParams extends Record<string, unknown>,
    TQuery extends Record<string, string>,
    TContext = Record<string, unknown>,
    TBody = unknown,
  >(
    request: Request,
  ): Promise<ConcreteRouterRequest<TParams, TQuery, TContext, TBody>> {
    const requestURL = new URL(request.url);

    // Query parameters
    const queryParams: Record<string, string> = {};
    for (const [key, value] of requestURL.searchParams) {
      queryParams[key] = value;
    }

    // Request context
    const reqContext: Record<string, unknown> = {};

    // Request body
    let reqBody: object | null = null;
    if (request.body) {
      if (!request.headers.get("Content-Type")?.includes("application/json")) {
        throw new UnsupportedMediaTypeError();
      }
      try {
        reqBody = await request.json();
      } catch (_) {
        throw new BodyParseError();
      }
    }

    return new ConcreteRouterRequest({
      _request: request,
      query: queryParams as TQuery,
      context: reqContext as TContext,
      body: reqBody as TBody,
    });
  }
}

let routerRequestFactory: RouterRequestFactory;

export function injectRouterRequestFactory(): RouterRequestFactory {
  if (!routerRequestFactory) {
    routerRequestFactory = new RouterRequestFactory();
  }
  return routerRequestFactory;
}

export class UnsupportedMediaTypeError extends Error {
  constructor() {
    super("Only the 'application/json' content-type is allowed");
  }
}

export class BodyParseError extends Error {
  constructor() {
    super("Failed to parse the request body into JSON");
  }
}

export default RouterRequestFactory;
