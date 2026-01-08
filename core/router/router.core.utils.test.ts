import { assert, assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  appendWildcardToRegExpPattern,
  buildRequestParameters,
  getRoutePathnameRegExpPattern,
  isRequestErrorHandler,
  isRequestProcesingHandler,
  matchRequestPathnameWithRoutePathname,
  normalizeRequestPathname,
  removeBeginningBoundaryFromRegExpPattern,
  removeEndingDollarSignFromRoutePathnameRegExpPattern,
  removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern,
  type RoutePathnameParamType,
  RoutePathnameParamWildcardError,
} from "./router.core.utils.ts";

describe("router.core.utils", () => {
  describe("normalizeRequestPathname", () => {
    it("should return the normalized request pathname", () => {
      assertEquals(normalizeRequestPathname("foo"), "foo");
      assertEquals(normalizeRequestPathname("/foo"), "foo");
      assertEquals(normalizeRequestPathname("foo/"), "foo");
      assertEquals(normalizeRequestPathname("/foo/"), "foo");
      assertEquals(normalizeRequestPathname(""), "");
      assertEquals(normalizeRequestPathname("/"), "");
      assertEquals(normalizeRequestPathname("//"), "");
    });
  });

  describe("removeBeginningBoundaryFromRegExpPattern", () => {
    it("should return the regex pattern with the beginning boundary removed", () => {
      assertEquals(removeBeginningBoundaryFromRegExpPattern("^foo"), "foo");
      assertEquals(removeBeginningBoundaryFromRegExpPattern("foo"), "foo");
    });
  });

  describe("appendWildcardToRegExpPattern", () => {
    it("should append a wildcard to the regex pattern", () => {
      assertEquals(
        appendWildcardToRegExpPattern("^foo$"),
        "^foo(/([a-zA-Z0-9+=*&_-]+/?)*)*$",
      );
    });

    it("should not append a wildcard to the regex pattern that already contains a wildcard", () => {
      const pattern = "^foo/(?<path>([a-zA-Z0-9+=*&_-]+/?)*)$";
      assertEquals(appendWildcardToRegExpPattern(pattern), pattern);
    });
  });

  describe("getRoutePathnameRegExpPattern", () => {
    it("should throw a RoutePathnameParamWildcardError if the wildcard parameter is not the last parameter", () => {
      assertThrows(
        () => getRoutePathnameRegExpPattern("foo/*{path}/bar"),
        RoutePathnameParamWildcardError,
      );
    });

    it("should return the exact route pathname regex pattern if there are no route parameters", () => {
      assertEquals(
        getRoutePathnameRegExpPattern("foo"),
        {
          regExpPattern: "^foo$",
          paramsTypes: {},
        },
      );
    });

    it("should return the route pathname regex pattern with route parameters", () => {
      assertEquals(
        getRoutePathnameRegExpPattern("foo/:id"),
        {
          regExpPattern: "^foo/(?<id>[a-zA-Z0-9+=*&_-]+)$",
          paramsTypes: { id: "param" },
        },
      );
    });

    it("should return the route pathname regex pattern with route wildcards", () => {
      assertEquals(
        getRoutePathnameRegExpPattern("foo/*{path}"),
        {
          regExpPattern: "^foo(?<path>(/([a-zA-Z0-9+=*&_-]+/?)*)*)$",
          paramsTypes: { path: "wildcard" },
        },
      );
    });

    it("should return the route pathname regex pattern with multiple route parameters", () => {
      assertEquals(
        getRoutePathnameRegExpPattern("foo/:id/bar/:name"),
        {
          regExpPattern:
            "^foo/(?<id>[a-zA-Z0-9+=*&_-]+)/bar/(?<name>[a-zA-Z0-9+=*&_-]+)$",
          paramsTypes: { id: "param", name: "param" },
        },
      );
    });

    it("should return the route pathname regex pattern with mixed route parameters and wildcards", () => {
      assertEquals(
        getRoutePathnameRegExpPattern("foo/:id/bar/*{path}"),
        {
          regExpPattern:
            "^foo/(?<id>[a-zA-Z0-9+=*&_-]+)/bar(?<path>(/([a-zA-Z0-9+=*&_-]+/?)*)*)$",
          paramsTypes: { id: "param", path: "wildcard" },
        },
      );
    });
  });

  describe("removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern", () => {
    it("should remove the wildcard param regex pattern from the route pathname regex pattern", () => {
      const route = getRoutePathnameRegExpPattern("foo/*{path}");
      const result =
        removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern(
          route.regExpPattern,
        );
      assertEquals(result, "^foo");
    });

    it("should remove the wildcard param regex pattern from the route pathname regex pattern with multiple params", () => {
      const route = getRoutePathnameRegExpPattern("foo/:id/bar/*{path}");
      const result =
        removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern(
          route.regExpPattern,
        );
      assertEquals(result, "^foo/(?<id>[a-zA-Z0-9+=*&_-]+)/bar");
    });

    it("should return the route pathname regex pattern as is if it does not contain a wildcard param regex pattern", () => {
      const route = getRoutePathnameRegExpPattern("foo/:id");
      const result =
        removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern(
          route.regExpPattern,
        );
      assertEquals(result, route.regExpPattern);
    });

    it("should return the route pathname regex pattern as is if it does not contain any param regex pattern", () => {
      const route = getRoutePathnameRegExpPattern("foo");
      const result =
        removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern(
          route.regExpPattern,
        );
      assertEquals(result, route.regExpPattern);
    });
  });

  describe("removeEndingDollarSignFromRoutePathnameRegExpPattern", () => {
    it("should remove the ending dollar sign from the regex pattern", () => {
      assertEquals(
        removeEndingDollarSignFromRoutePathnameRegExpPattern("foo$"),
        "foo",
      );
    });

    it("should return the regex pattern as is if it does not end with a dollar sign", () => {
      assertEquals(
        removeEndingDollarSignFromRoutePathnameRegExpPattern("foo"),
        "foo",
      );
    });
  });

  describe("matchRequestPathnameWithRoutePathname", () => {
    it("should match the request pathname with the route pathname regex pattern", () => {
      const route = getRoutePathnameRegExpPattern("foo/:id");
      const match = matchRequestPathnameWithRoutePathname(
        "/foo/123",
        route.regExpPattern,
      );
      assert(match);
      assertEquals(match.groups?.id, "123");
    });

    it("should not match the request pathname with the route pathname regex pattern", () => {
      const route = getRoutePathnameRegExpPattern("foo/:id");
      const noMatch = matchRequestPathnameWithRoutePathname(
        "/bar/123",
        route.regExpPattern,
      );
      assertEquals(noMatch, null);
    });

    it("should match the request pathname with the route pathname regex pattern containing a wildcard", () => {
      const route = getRoutePathnameRegExpPattern("foo/*{path}");
      const match = matchRequestPathnameWithRoutePathname(
        "/foo/bar/baz",
        route.regExpPattern,
      );
      assert(match);
      assertEquals(match.groups?.path, "/bar/baz");
    });

    it("should match the request pathname with the route pathname regex pattern containing a wildcard but empty request path", () => {
      const route = getRoutePathnameRegExpPattern("foo/*{path}");
      const match = matchRequestPathnameWithRoutePathname(
        "/foo",
        route.regExpPattern,
      );
      assert(match);
      assertEquals(match.groups?.path, "");
    });
  });

  describe("buildRequestParameters", () => {
    it("should return the request parameters for 'param' type", () => {
      const groups = { id: "123" };
      const paramsTypes: Record<string, RoutePathnameParamType> = {
        id: "param",
      };
      const result = buildRequestParameters(groups, paramsTypes);
      assertEquals(result, { id: "123" });
    });

    it("should return the request parameters for 'wildcard' type", () => {
      const groups = { path: "a/b/c" };
      const paramsTypes: Record<string, RoutePathnameParamType> = {
        path: "wildcard",
      };
      const result = buildRequestParameters(groups, paramsTypes);
      assertEquals(result, { path: ["a", "b", "c"] });
    });

    it("should handle wildcard parameters with leading/trailing slashes", () => {
      const groups = { path: "/a/b/" };
      const paramsTypes: Record<string, RoutePathnameParamType> = {
        path: "wildcard",
      };
      const result = buildRequestParameters(groups, paramsTypes);
      assertEquals(result, { path: ["a", "b"] });
    });

    it("should return mixed request parameters", () => {
      const groups = { id: "123", path: "files/images" };
      const paramsTypes: Record<string, RoutePathnameParamType> = {
        id: "param",
        path: "wildcard",
      };
      const result = buildRequestParameters(groups, paramsTypes);
      assertEquals(result, {
        id: "123",
        path: ["files", "images"],
      });
    });

    it("should throw an error for invalid parameter type", () => {
      const groups = { id: "123" };
      // deno-lint-ignore no-explicit-any
      const paramsTypes: Record<string, any> = { id: "invalid" };
      assertThrows(
        () => {
          buildRequestParameters(groups, paramsTypes);
        },
        Error,
        "Invalid request parameter type: invalid",
      );
    });

    it("should return empty object if no groups provided", () => {
      const groups = {};
      const paramsTypes: Record<string, RoutePathnameParamType> = {};
      const result = buildRequestParameters(groups, paramsTypes);
      assertEquals(result, {});
    });
  });

  describe("isRequestProcesingHandler", () => {
    it("should return true if the function is a request processing handler", () => {
      const handler = (
        _req: unknown,
        _res: unknown,
        _next: unknown,
      ) => Promise.resolve();
      // @ts-ignore: Mocking handler for testing purposes
      assert(isRequestProcesingHandler(handler));
    });

    it("should return true if the function is a request processing handler with 2 arguments", () => {
      const handler = (
        _req: unknown,
        _res: unknown,
      ) => Promise.resolve();
      // @ts-ignore: Mocking handler for testing purposes
      assert(isRequestProcesingHandler(handler));
    });

    it("should return false if the function is not a request processing handler", () => {
      const errorHandler = (
        _err: unknown,
        _req: unknown,
        _res: unknown,
        _next: unknown,
      ) => Promise.resolve();
      // @ts-ignore: Mocking handler for testing purposes
      assertEquals(isRequestProcesingHandler(errorHandler), false);
    });
  });

  describe("isRequestErrorHandler", () => {
    it("should return false if the function is not a request error handler", () => {
      const handler = (
        _req: unknown,
        _res: unknown,
        _next: unknown,
      ) => Promise.resolve();
      // @ts-ignore: Mocking handler for testing purposes
      assertEquals(isRequestErrorHandler(handler), false);
    });

    it("should return true if the function is a request error handler", () => {
      const errorHandler = (
        _err: unknown,
        _req: unknown,
        _res: unknown,
        _next: unknown,
      ) => Promise.resolve();
      // @ts-ignore: Mocking handler for testing purposes
      assert(isRequestErrorHandler(errorHandler));
    });
  });
});
