// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MotionProvider } from "./MotionProvider";
import { Reveal } from "./Reveal";
import { Stagger } from "./Stagger";

// Real motion library (no mock): LazyMotion strict must accept our `m` components, and SSR must never hide content.
describe("SSR and strict LazyMotion with the real library [VCK-009-AC4]", () => {
  it("server markup is visible (no inline opacity/transform)", () => {
    const html = renderToString(
      <MotionProvider><Reveal>hello</Reveal><Stagger><i>a</i><i>b</i></Stagger></MotionProvider>,
    );
    expect(html).toContain("hello");
    expect(html).not.toMatch(/opacity|transform/);
  });

  it("mounts without a strict-mode error and arms below-fold content", () => {
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    window.matchMedia = (() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    const { container } = render(<MotionProvider><Reveal>x</Reveal></MotionProvider>);
    expect(container.textContent).toBe("x");
    expect(container.querySelector("[data-motion='full']")).not.toBeNull();
  });
});
