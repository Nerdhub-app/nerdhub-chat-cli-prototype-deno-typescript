import { assertEquals, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import { describe, it } from "@std/testing/bdd";
import ConcreteAppRouter from "./app-router.ts";
import {
  BodyParseError,
  type RouterRequestFactory,
  UnsupportedMediaTypeError,
} from "./router-request.factory.ts";
import { ConcreteRouterResponse } from "./router-response.ts";
import { HttpResponseStatus } from "./router.core.const.ts";
import { UnmatchedRequestThroughEntriesError } from "./router.ts";
import { ConcreteRouterRequest } from "./router-request.ts";

/**
 * Mock RouterRequestFactory
 */
class MockRouterRequestFactory implements RouterRequestFactory {
  createFromDenoRequest<
    TParams extends Record<string, unknown>,
    TQuery extends Record<string, string>,
    TContext,
    TBody,
  >(
    request: Request,
  ): Promise<ConcreteRouterRequest<TParams, TQuery, TContext, TBody>> {
    return Promise.resolve(
      new ConcreteRouterRequest<TParams, TQuery, TContext, TBody>({
        _request: request,
        query: {} as TQuery,
        context: {} as TContext,
        body: null as unknown as TBody,
      }),
    );
  }
}

describe("ConcreteAppRouter", () => {
  const mockFactory = new MockRouterRequestFactory();
  const timeout = 100;
  const router = new ConcreteAppRouter(mockFactory, timeout);

  describe("handleDenoRequest", () => {
    it("should return a timeout response when handlers return undefined", async () => {
      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => Promise.resolve(undefined),
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.TIMEOUT);
        const body = await response.text();
        assertStringIncludes(body, "Timeout of 100ms exceeded");
      } finally {
        channelStub.restore();
      }
    });

    it("should return a Deno response when handlers return ConcreteRouterResponse", async () => {
      const routerResponse = new ConcreteRouterResponse();
      routerResponse.setStatus(HttpResponseStatus.CREATED).text(
        "Created",
      );

      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => Promise.resolve(routerResponse),
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.CREATED);
        assertEquals(await response.text(), "Created");
      } finally {
        channelStub.restore();
      }
    });

    it("should return a Deno response when handlers return a raw Response", async () => {
      const rawResponse = new Response("Raw", {
        status: HttpResponseStatus.CREATED,
      });

      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => Promise.resolve(rawResponse),
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.CREATED);
        assertEquals(await response.text(), "Raw");
      } finally {
        channelStub.restore();
      }
    });

    it("should return a JSON response when handlers return an object", async () => {
      const data = { foo: "bar" };

      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => Promise.resolve(data),
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.OK);
        assertEquals(response.headers.get("Content-Type"), "application/json");
        assertEquals(await response.json(), data);
      } finally {
        channelStub.restore();
      }
    });

    it("should return a text response when handlers return a string", async () => {
      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => Promise.resolve("Hello World"),
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.OK);
        assertEquals(response.headers.get("Content-Type"), "application/text");
        assertEquals(await response.text(), "Hello World");
      } finally {
        channelStub.restore();
      }
    });

    it("should return 400 Bad Request when BodyParseError is thrown", async () => {
      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => {
          throw new BodyParseError();
        },
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.BAD_REQUEST);
        assertStringIncludes(await response.text(), "Failed to parse");
      } finally {
        channelStub.restore();
      }
    });

    it("should return 415 Unsupported Media Type when UnsupportedMediaTypeError is thrown", async () => {
      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => {
          throw new UnsupportedMediaTypeError();
        },
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(
          response.status,
          HttpResponseStatus.UNSUPPORTED_MEDIA_TYPE,
        );
        assertStringIncludes(await response.text(), "content-type is allowed");
      } finally {
        channelStub.restore();
      }
    });

    it("should return 404 Not Found when UnmatchedRequestThroughEntriesError is thrown", async () => {
      const mockRequest = new ConcreteRouterRequest({
        _request: new Request("http://localhost/path"),
        query: {},
        context: {},
        body: null,
      });

      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => {
          throw new UnmatchedRequestThroughEntriesError(mockRequest);
        },
      );
      try {
        const request = new Request("http://localhost/path");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.NOT_FOUND);
        assertEquals(await response.text(), "Cannot GET /path");
      } finally {
        channelStub.restore();
      }
    });

    it("should return 500 Internal Server Error for generic errors", async () => {
      const channelStub = stub(
        router,
        "channelRequestThroughRequestHandlers",
        () => {
          throw new Error("Something went wrong");
        },
      );
      try {
        const request = new Request("http://localhost/");
        const response = await router.handleDenoRequest(request);

        assertEquals(response.status, HttpResponseStatus.INTERNAL_SERVER_ERROR);
        assertEquals(await response.text(), "Internal server error");
      } finally {
        channelStub.restore();
      }
    });
  });
});
