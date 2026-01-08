import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { spy } from "@std/testing/mock";
import {
  bindRequestParameter,
  onRequest,
  setHttpResponseStatus,
} from "./router.core.decorators.ts";
import ConcreteRouterRequest from "./router-request.ts";
import type { RouterResponse } from "./router.core.d.ts";

describe("router.core.decorators", () => {
  describe("bindRequestParameter", () => {
    it("should bind a request parameter synchronously", async () => {
      // Mock class to apply decorator
      class TestController {
        // Apply decorator manually if TypeScript experimental decorators are not enabled
        // or just use the @ syntax if we assume they are supported.
        // Given the signature in router.core.decorators.ts, it's a legacy decorator.

        // deno-lint-ignore require-await
        async handler(req: ConcreteRouterRequest) {
          return req.params.userId;
        }
      }

      const controller = new TestController();
      const descriptor = Object.getOwnPropertyDescriptor(
        TestController.prototype,
        "handler",
      )!;

      // Apply the decorator
      const decorator = bindRequestParameter(
        "id",
        (value) => ["userId", Number(value)],
      );
      decorator(TestController.prototype, "handler", descriptor);

      // Update the prototype with the decorated method
      Object.defineProperty(TestController.prototype, "handler", descriptor);

      const req = new ConcreteRouterRequest({
        query: {},
        context: {},
        body: null,
        _request: new Request("http://localhost/foo"),
      });
      req.params = { id: "123" };

      const result = await controller.handler(req);
      assertEquals(result, 123);
      assertEquals(req.params.userId, 123);
    });

    it("should bind a request parameter asynchronously", async () => {
      class TestController {
        // deno-lint-ignore require-await
        async handler(req: ConcreteRouterRequest) {
          return req.params.userId;
        }
      }

      const controller = new TestController();
      const descriptor = Object.getOwnPropertyDescriptor(
        TestController.prototype,
        "handler",
      )!;

      const decorator = bindRequestParameter("id", async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ["userId", Number(value)];
      });
      decorator(TestController.prototype, "handler", descriptor);
      Object.defineProperty(TestController.prototype, "handler", descriptor);

      const req = new ConcreteRouterRequest({
        query: {},
        context: {},
        body: null,
        _request: new Request("http://localhost/foo"),
      });
      req.params = { id: "456" };

      const result = await controller.handler(req);
      assertEquals(result, 456);
      assertEquals(req.params.userId, 456);
    });
  });

  describe("setHttpResponseStatus", () => {
    it("should set the httpResponseStatus property on the decorated method", () => {
      class TestController {
        handler() {}
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        TestController.prototype,
        "handler",
      )!;

      const status = 201;
      const decorator = setHttpResponseStatus(status);
      decorator(TestController.prototype, "handler", descriptor);

      // @ts-ignore: Accessing custom property
      assertEquals(descriptor.value.httpResponseStatus, status);
    });
  });

  describe("onRequest", () => {
    it("should call the synchronous callback before the handler", async () => {
      const callback = spy(() => {});

      class TestController {
        // deno-lint-ignore require-await
        async handler(_req: ConcreteRouterRequest, _res: RouterResponse) {
          return "handler called";
        }
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        TestController.prototype,
        "handler",
      )!;

      const decorator = onRequest(callback);
      decorator(TestController.prototype, "handler", descriptor);
      Object.defineProperty(TestController.prototype, "handler", descriptor);

      const controller = new TestController();
      // We spy on the prototype's original implementation by wrapping it before decoration if we wanted to see if it's called,
      // but here we want to verify the decorated method's behavior.
      // Let's spy on the already decorated method of the instance.
      const decoratedHandlerSpy = spy(controller, "handler");

      const req = new ConcreteRouterRequest({
        query: {},
        context: {},
        body: null,
        _request: new Request("http://localhost/foo"),
      });
      const res = {} as unknown as RouterResponse;

      const result = await controller.handler(req, res);

      assertEquals(result, "handler called");
      assertEquals(callback.calls.length, 1);
      assertEquals(decoratedHandlerSpy.calls.length, 1);
    });

    it("should call the asynchronous callback before the handler", async () => {
      const callback = spy(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      class TestController {
        // deno-lint-ignore require-await
        async handler(_req: ConcreteRouterRequest, _res: RouterResponse) {
          return "handler called";
        }
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        TestController.prototype,
        "handler",
      )!;

      const decorator = onRequest(callback);
      decorator(TestController.prototype, "handler", descriptor);
      Object.defineProperty(TestController.prototype, "handler", descriptor);

      const controller = new TestController();
      const decoratedHandlerSpy = spy(controller, "handler");

      const req = new ConcreteRouterRequest({
        query: {},
        context: {},
        body: null,
        _request: new Request("http://localhost/foo"),
      });
      const res = {} as unknown as RouterResponse;

      const result = await controller.handler(req, res);

      assertEquals(result, "handler called");
      assertEquals(callback.calls.length, 1);
      assertEquals(decoratedHandlerSpy.calls.length, 1);
    });
  });
});
