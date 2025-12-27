import {
  REQUEST_PATHNAME_PARAM_VALUE_REGEXP_PATTERN,
  REQUEST_PATHNAME_PARAM_WILDCARD_VALUE_REGEXP_PATTERN,
  REQUEST_PATHNAME_PARAM_WILDCARD_WITH_LEADING_FORWARD_SLASH_VALUE_REGEXP_PATTERN,
  ROUTE_PATHNAME_PARAM_NAME_REGEXP_PATTERN,
  ROUTE_PATHNAME_PARAM_SLOT_REGEXP_PATTERN,
  ROUTE_PATHNAME_PARAM_WILDCARD_REGEXP_PATTERN,
} from "./router.core.const.ts";
import type {
  GenericRequestErrorHandler,
  GenericRequestProcessingHandler,
} from "./router.core.d.ts";

/**
 * Normalizes the request pathname by removing leading and trailing slashes.
 *
 * @param pathname The request pathname to normalize.
 * @returns The normalized request pathname.
 */
export function normalizeRequestPathname(pathname: string): string {
  return pathname.replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Matches the request pathname with the route pathname regex pattern.
 *
 * @param reqPathname The request pathname to match.
 * @param routePathnameRegExpPattern The route pathname regex pattern to match against.
 * @returns The match result.
 */
export function matchRequestPathnameWithRoutePathname(
  reqPathname: string,
  routePathnameRegExpPattern: string,
) {
  const normReqPathname = normalizeRequestPathname(reqPathname);
  return normReqPathname.match(new RegExp(routePathnameRegExpPattern));
}

/**
 * Removes the wildcard parameter regex pattern from the route pathname regex pattern.
 *
 * @param routePathnameRegExpPattern The route pathname regex pattern to remove the wildcard parameter regex pattern from.
 * @returns The route pathname regex pattern without the wildcard parameter regex pattern.
 */
export function removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern(
  routePathnameRegExpPattern: string,
): string {
  const escapedEndingWildcardRegExpPattern = RegExp.escape(`(?<`) +
    ROUTE_PATHNAME_PARAM_NAME_REGEXP_PATTERN +
    RegExp.escape(`>`) + `(` +
    RegExp.escape(REQUEST_PATHNAME_PARAM_WILDCARD_VALUE_REGEXP_PATTERN) + `|` +
    RegExp.escape(
      REQUEST_PATHNAME_PARAM_WILDCARD_WITH_LEADING_FORWARD_SLASH_VALUE_REGEXP_PATTERN,
    ) + `)` + RegExp.escape(`)$`) +
    "$";
  return routePathnameRegExpPattern.replace(
    new RegExp(escapedEndingWildcardRegExpPattern),
    "",
  );
}

/**
 * Removes the ending dollar sign from the route pathname regex pattern.
 *
 * @param routePathnameRegExpPattern The route pathname regex pattern to remove the ending dollar sign from.
 * @returns The route pathname regex pattern without the ending dollar sign.
 */
export function removeEndingDollarSignFromRoutePathnameRegExpPattern(
  routePathnameRegExpPattern: string,
): string {
  return routePathnameRegExpPattern.replace(/\$$/, "");
}

/**
 * Builds the request parameters from the regex pattern groups.
 *
 * @param groups The regex pattern groups.
 * @param paramsTypes The regex pattern parameters types.
 * @returns The request parameters.
 */
export function buildRequestParameters(
  groups: Record<string, string>,
  paramsTypes: Record<string, RoutePathnameParamType>,
): Record<string, string | string[]> {
  const requestParameters: Record<string, string | string[]> = {};
  for (const [paramName, paramValue] of Object.entries(groups)) {
    if (paramsTypes[paramName] === "param") {
      requestParameters[paramName] = paramValue;
    } else if (paramsTypes[paramName] === "wildcard") {
      requestParameters[paramName] = paramValue.split("/").filter((value) =>
        value !== ""
      );
    } else {
      throw new Error(
        `Invalid request parameter type: ${paramsTypes[paramName]}`,
      );
    }
  }
  return requestParameters;
}

/**
 * The route pathname parameter type.
 *
 * @property {"param" | "wildcard"} type - The route pathname parameter type.
 */
export type RoutePathnameParamType = "param" | "wildcard";

/**
 * The regex pattern data.
 *
 * @property {string} regExpPattern - The regex pattern.
 * @property {Record<string, RoutePathnameParamType>} paramsTypes - The regex pattern parameters types.
 */
export type RegExpPatternData = {
  regExpPattern: string;
  paramsTypes: Record<string, RoutePathnameParamType>;
};

/**
 * The route pathname parameter wildcard error.
 * A wildcard parameter must end the route pathname.
 */
export class RoutePathnameParamWildcardError extends Error {
  constructor() {
    super("Route pathname parameter wildcard must be the last parameter.");
  }
}

/**
 * Gets the route pathname regex pattern.
 *
 * @param routePathname The route pathname to get the regex pattern for.
 * @returns The route pathname regex pattern.
 */
export function getRoutePathnameRegExpPattern(
  routePathname: string,
): RegExpPatternData {
  const normRoutePathname = normalizeRequestPathname(routePathname);

  const routeParamSlotsMatches = [...normRoutePathname.matchAll(
    new RegExp(ROUTE_PATHNAME_PARAM_SLOT_REGEXP_PATTERN, "g"),
  )];

  const routeParamWildcardsMatches = normRoutePathname.match(
    new RegExp(ROUTE_PATHNAME_PARAM_WILDCARD_REGEXP_PATTERN),
  );
  if (
    routeParamWildcardsMatches && routeParamWildcardsMatches.index &&
    (routeParamWildcardsMatches.index + routeParamWildcardsMatches[0].length) <
      normRoutePathname.length
  ) {
    throw new RoutePathnameParamWildcardError();
  }

  let regExpPattern = `^${normRoutePathname}$`;
  const paramsTypes: Record<string, RoutePathnameParamType> = {};

  // Return the exact route pathname regex pattern if there are no route parameters.
  if (
    routeParamSlotsMatches.length === 0 &&
    !routeParamWildcardsMatches
  ) {
    return { regExpPattern, paramsTypes: {} };
  }

  // Replace route parameter slots with regex patterns.
  for (const matches of routeParamSlotsMatches) {
    const [match] = matches;
    const paramName = match.slice(1); // Remove the leading colon
    const resolvedRouteParamSlotRegExp =
      `(?<${paramName}>${REQUEST_PATHNAME_PARAM_VALUE_REGEXP_PATTERN})`;
    regExpPattern = regExpPattern.replaceAll(
      match,
      resolvedRouteParamSlotRegExp,
    );
    paramsTypes[paramName] = "param";
  }

  // Replace route parameter wildcards with regex patterns.
  if (routeParamWildcardsMatches) {
    const [match] = routeParamWildcardsMatches;
    const startWithForwardSlash = match.startsWith("/");
    const paramNameStartIndex = startWithForwardSlash ? 3 : 2;
    const paramName = match.slice(paramNameStartIndex, -1); // Remove the leading "*{" or "/*{" and trailing "}".
    const wildcardValueRegExpPattern = startWithForwardSlash
      ? REQUEST_PATHNAME_PARAM_WILDCARD_WITH_LEADING_FORWARD_SLASH_VALUE_REGEXP_PATTERN
      : REQUEST_PATHNAME_PARAM_WILDCARD_VALUE_REGEXP_PATTERN;
    const resolvedRouteParamWildcardRegExp =
      `(?<${paramName}>${wildcardValueRegExpPattern})`;
    regExpPattern = regExpPattern.replaceAll(
      match,
      resolvedRouteParamWildcardRegExp,
    );
    paramsTypes[paramName] = "wildcard";
  }

  return { regExpPattern, paramsTypes };
}

/**
 * Removes the beginning boundary from the given regex pattern.
 *
 * @param pattern The regex pattern to remove the beginning boundary from.
 * @returns The regex pattern with the beginning boundary removed.
 */
export function removeBeginningBoundaryFromRegExpPattern(
  pattern: string,
): string {
  return pattern.replace(/^\^/, "");
}

/**
 * Appends a wildcard to the given regex pattern.
 *
 * @param pattern The regex pattern to append a wildcard to.
 * @returns The regex pattern with the wildcard appended.
 */
export function appendWildcardToRegExpPattern(pattern: string): string {
  const escapedEndingWildcardRegExpPattern = RegExp.escape(`(?<`) +
    ROUTE_PATHNAME_PARAM_NAME_REGEXP_PATTERN +
    RegExp.escape(
      `>${REQUEST_PATHNAME_PARAM_WILDCARD_VALUE_REGEXP_PATTERN})$`,
    ) +
    "$";
  if (new RegExp(escapedEndingWildcardRegExpPattern).test(pattern)) {
    return pattern;
  }
  return pattern.replace(
    /\$/,
    `${REQUEST_PATHNAME_PARAM_WILDCARD_WITH_LEADING_FORWARD_SLASH_VALUE_REGEXP_PATTERN}$`,
  );
}

/**
 * Checks if the given function is a request processing handler.
 *
 * @param fn The function to check.
 * @returns True if the function is a request processing handler, false otherwise.
 */
export function isRequestProcesingHandler(
  fn: GenericRequestProcessingHandler | GenericRequestErrorHandler,
): fn is GenericRequestProcessingHandler {
  return typeof fn === "function" && fn.length <= 3;
}

/**
 * Checks if the given function is a request error handler.
 *
 * @param fn The function to check.
 * @returns True if the function is a request error handler, false otherwise.
 */
export function isRequestErrorHandler(
  fn: GenericRequestProcessingHandler | GenericRequestErrorHandler,
): fn is GenericRequestErrorHandler {
  return typeof fn === "function" && fn.length === 4;
}
