// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dur, ease, distance } from "../motion";
import { MotionProvider, useMotionPrefs } from "./MotionProvider";
import { Reveal } from "./Reveal";
import { Stagger } from "./Stagger";

// Probe: m.div renders the animation props as JSON so the tests can read them without a real animation engine.
vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  const probe = ({ initial, whileInView, viewport, transition, children, className, ref, ...rest }: Record<string, unknown>) =>
    createElement("div", {
      ref: ref as never,
      className: className as string,
      "data-motion": rest["data-motion"] as string,
      "data-props": JSON.stringify({ initial, whileInView, viewport, transition }),
    }, children as never);
  return {
    LazyMotion: ({ children }: { children: never }) => children,
    domAnimation: {},
    m: { div: probe },
  };
});

let osReduced = false;
const listeners = new Set<() => void>();
let rect = { top: 2000, bottom: 2100 }; // below the 768px fold by default

beforeEach(() => {
  osReduced = false;
  rect = { top: 2000, bottom: 2100 };
  listeners.clear();
  window.matchMedia = ((q: string) => ({
    media: q,
    get matches() {
      return osReduced;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => rect as DOMRect);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

interface Probe { initial?: Record<string, number>; whileInView?: Record<string, number>; transition?: { duration: number; ease: number[]; delay?: number } }
const probes = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLElement>("[data-props]")].map((el) => ({ el, p: JSON.parse(el.dataset["props"] ?? "{}") as Probe }));

const first = (c: HTMLElement) => {
  const [one] = probes(c);
  if (!one) throw new Error("no animated element rendered");
  return one;
};

function Toggle({ on }: { on: boolean }) {
  const { setReducedMotion } = useMotionPrefs();
  useEffect(() => setReducedMotion(on), [on, setReducedMotion]);
  return null;
}

const ALLOWED = new Set(["opacity", "x", "y", "scale", "clipPath"]);

describe("Reveal, normal motion [VCK-009-AC4]", () => {
  it("below the fold starts hidden and reveals with expressive/enter", () => {
    const { container } = render(<MotionProvider><Reveal>x</Reveal></MotionProvider>);
    const { p, el } = first(container);
    expect(p.initial).toEqual({ opacity: 0, y: distance.reveal });
    expect(p.whileInView).toEqual({ opacity: 1, y: 0 });
    expect(p.transition?.duration).toBe(dur.expressive / 1000);
    expect(p.transition?.ease).toEqual([...ease.enter]);
    expect(el.dataset["motion"]).toBe("full");
  });

  it("in the viewport at mount is not animated (LCP)", () => {
    rect = { top: 100, bottom: 400 };
    const { container } = render(<MotionProvider><Reveal>x</Reveal></MotionProvider>);
    const { p } = first(container);
    expect(p.initial).toBeUndefined();
    expect(p.whileInView).toBeUndefined();
  });

  it("Stagger delays 0,50..350 then 0 from the 9th child", () => {
    const { container } = render(
      <MotionProvider><Stagger>{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</Stagger></MotionProvider>,
    );
    expect(probes(container).map(({ p }) => (p.transition?.delay ?? 0) * 1000)).toEqual([0, 50, 100, 150, 200, 250, 300, 350, 0, 0]);
  });
});

describe("reduced motion matrix (OS x toggle) [VCK-009-AC4]", () => {
  it.each([
    [false, false, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
  ])("OS %s, toggle %s -> reduced %s", async (os, toggle, reduced) => {
    osReduced = os;
    const { container } = render(
      <MotionProvider>
        {toggle ? <Toggle on /> : null}
        <Stagger><b /><b /><b /></Stagger>
      </MotionProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    for (const { el, p } of probes(container)) {
      expect(el.dataset["motion"]).toBe(reduced ? "reduced" : "full");
      if (!reduced) continue;
      for (const o of [p.initial, p.whileInView]) {
        expect(Object.keys(o ?? {})).toEqual(["opacity"]);
      }
      expect(p.transition?.duration).toBeLessThanOrEqual(0.1);
      expect(p.transition?.delay ?? 0).toBe(0);
    }
  });

  it("only compositor props are animated", () => {
    const { container } = render(<MotionProvider><Reveal>x</Reveal></MotionProvider>);
    for (const { p } of probes(container)) {
      for (const o of [p.initial, p.whileInView]) for (const k of Object.keys(o ?? {})) expect(ALLOWED.has(k)).toBe(true);
    }
  });

  it("follows a live OS change", () => {
    const { container } = render(<MotionProvider><Reveal>x</Reveal></MotionProvider>);
    expect(probes(container)[0]?.el.dataset["motion"]).toBe("full");
    osReduced = true;
    act(() => {
      listeners.forEach((fn) => fn());
    });
    expect(probes(container)[0]?.el.dataset["motion"]).toBe("reduced");
  });
});
