import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  BodyParseError,
  RouterRequestFactory,
  UnsupportedMediaTypeError,
} from "./router-request.factory.ts";

describe("RouterRequestFactory", () => {
  const factory = new RouterRequestFactory();

  describe("createFromDenoRequest", () => {
    it("should create a request with no query params or body", async () => {
      const rawRequest = new Request("http://localhost:3000/test", {
        method: "GET",
      });
      const routerRequest = await factory.createFromDenoRequest(rawRequest);

      assertEquals(routerRequest.query, {});
      assertEquals(routerRequest.body, null);
      assertEquals(routerRequest.context, {});
      assertEquals(routerRequest.params, undefined);
    });

    it("should create a request with query params", async () => {
      const rawRequest = new Request(
        "http://localhost:3000/test?foo=bar&baz=qux",
        {
          method: "GET",
        },
      );
      const routerRequest = await factory.createFromDenoRequest(rawRequest);

      assertEquals(routerRequest.query, { foo: "bar", baz: "qux" });
      assertEquals(routerRequest.body, null);
    });

    it("should create a request with JSON body", async () => {
      const body = { message: "hello" };
      const rawRequest = new Request("http://localhost:3000/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const routerRequest = await factory.createFromDenoRequest(rawRequest);

      assertEquals(routerRequest.body, body);
    });

    it("should throw UnsupportedMediaTypeError if body is present but Content-Type is not application/json", async () => {
      const rawRequest = new Request("http://localhost:3000/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "plain text",
      });

      await assertRejects(
        () => factory.createFromDenoRequest(rawRequest),
        UnsupportedMediaTypeError,
        "Only the 'application/json' content-type is allowed",
      );
    });

    it("should throw BodyParseError if JSON body is invalid", async () => {
      const rawRequest = new Request("http://localhost:3000/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });

      await assertRejects(
        () => factory.createFromDenoRequest(rawRequest),
        BodyParseError,
        "Failed to parse the request body into JSON",
      );
    });

    it("should ignore body if request has no body (e.g. GET)", async () => {
      const rawRequest = new Request("http://localhost:3000/test", {
        method: "GET",
      });
      // Even if content-type is json, if there is no body, it should just be null
      // However, the factory checks `if (request.body)`. `Request` objects with GET method usually have body as null.

      const routerRequest = await factory.createFromDenoRequest(rawRequest);
      assertEquals(routerRequest.body, null);
    });
  });
});
