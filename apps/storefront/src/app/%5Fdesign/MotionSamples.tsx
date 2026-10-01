"use client";
import { Reveal, Stagger } from "@vck/ui-kit";

const ITEMS = ["Ưu đãi", "Giao nhanh", "Đổi trả 30 ngày", "Thanh toán VNPay"];

/** Below-the-fold samples so Reveal arms (MI-25); under reduced motion they fade only, no transform. */
export function MotionSamples() {
  return (
    <>
      <Reveal className="rounded-lg bg-card p-6 shadow-md">
        <p data-testid="sample-reveal">Reveal: opacity + 16 lên khi vào khung nhìn.</p>
      </Reveal>
      <Stagger className="mt-4 grid gap-4 sm:grid-cols-2">
        {ITEMS.map((t) => (
          <p key={t} data-testid="sample-stagger" className="rounded-lg bg-primary-tint p-4 text-primary">
            {t}
          </p>
        ))}
      </Stagger>
    </>
  );
}
