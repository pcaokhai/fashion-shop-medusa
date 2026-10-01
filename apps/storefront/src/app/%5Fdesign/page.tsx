import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { isDesignRouteEnabled } from "./gate";
import { MotionSamples } from "./MotionSamples";

// Folder is `%5Fdesign`: a plain `_design` is a Next private folder and never routes.
const SCALE = ["caption", "small", "body", "lead", "h4", "h3", "h2", "h1", "display"] as const;
const BUTTONS: ReadonlyArray<readonly [string, string]> = [
  ["cta", "bg-cta text-on-primary hover:bg-cta-hover"],
  ["primary", "bg-primary text-on-primary hover:bg-primary-hover"],
  ["outline", "border border-border bg-card text-foreground"],
  ["ghost", "text-primary"],
  ["destructive", "bg-destructive text-on-primary"],
];
const SAMPLE = "Ưu đãi đặc biệt – Giảm 30% – Đồng hồ";

function readColours(): Array<[string, string]> {
  const css = readFileSync(join(process.cwd(), "../../packages/ui-kit/src/tokens.css"), "utf8");
  return [...css.matchAll(/^\s*(--color-[a-z-]+):\s*(#[0-9A-Fa-f]{3,8});/gm)].flatMap((m) => (m[1] && m[2] ? [[m[1], m[2]] as [string, string]] : []));
}

export default function DesignPage() {
  if (!isDesignRouteEnabled(process.env)) notFound();
  const colours = readColours();
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-h1 font-bold text-heading">Design review</h1>
      <p lang="vi" className="mt-2" data-testid="vi-sample" style={{ fontWeight: 600 }}>
        {SAMPLE}
      </p>

      <section aria-labelledby="colours" className="mt-8">
        <h2 id="colours" className="text-h3 font-semibold text-heading">Màu sắc</h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colours.map(([name, value]) => (
            <li key={name} data-testid="swatch" className="rounded-md border border-border bg-card p-2 text-small">
              <div aria-hidden="true" className="h-12 rounded-sm border border-border" style={{ background: `var(${name})` }} />
              <code className="mt-1 block break-all">{name}</code>
              <span className="text-muted-foreground">{value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type" className="mt-8">
        <h2 id="type" className="text-h3 font-semibold text-heading">Chữ</h2>
        {SCALE.map((s) => (
          <p key={s} data-testid="type-row" style={{ fontSize: `var(--text-${s})` }}>
            {s}: Be Vietnam Pro – Ưu đãi
          </p>
        ))}
      </section>

      <section aria-labelledby="comp" className="mt-8">
        <h2 id="comp" className="text-h3 font-semibold text-heading">Thành phần</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {BUTTONS.map(([v, cls]) => (
            <button key={v} type="button" data-testid="btn" className={`min-h-11 rounded-md px-5 font-semibold ${cls}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span data-testid="badge" className="rounded-full bg-price-sale px-2 py-1 text-caption font-semibold text-on-primary">-30%</span>
          <button type="button" aria-pressed="true" data-testid="chip" className="min-h-9 rounded-full bg-primary-tint px-4 font-medium text-primary">
            Áo thun
          </button>
          <button type="button" aria-pressed="false" data-testid="chip" className="min-h-9 rounded-full border border-border bg-card px-4">
            Quần jean
          </button>
        </div>
      </section>

      <section aria-labelledby="motion" className="mt-8" style={{ marginBottom: "var(--space-3xl)" }}>
        <h2 id="motion" className="text-h3 font-semibold text-heading">Chuyển động</h2>
        <div style={{ minHeight: "120vh" }} aria-hidden="true" />
        <MotionSamples />
      </section>
    </main>
  );
}
