import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

import { isDesignRouteEnabled } from "./%5Fdesign/gate";
import DesignPage from "./%5Fdesign/page";

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

describe("/_design gate [VCK-009-AC5]", () => {
  it.each([
    ["development", true],
    ["test", true],
    ["production", false],
    [undefined, false],
    ["staging", false],
  ])("isDesignRouteEnabled(%s) is %s", (nodeEnv, expected) => {
    expect(isDesignRouteEnabled({ NODE_ENV: nodeEnv })).toBe(expected);
  });

  it("page calls notFound() in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => DesignPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("page renders without notFound() in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(DesignPage()).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });
});
