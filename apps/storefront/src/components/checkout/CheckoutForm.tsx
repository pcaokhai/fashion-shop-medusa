"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Banknote, Check, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Cart } from "@/lib/data";
import type { CheckoutInput, PaymentMethod, ShippingOption, Unit } from "@/lib/data/checkout";
import { loadWards, placeOrder } from "@/lib/data/checkout-actions";
import { formatVnd } from "@/lib/money";
import { isVnPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { OrderSummary } from "./OrderSummary";
import { UnitCombobox } from "./UnitCombobox";

type Errors = Partial<Record<keyof CheckoutInput | "form", string>>;
type Values = Omit<CheckoutInput, "shippingOptionId">;

const DRAFT_KEY = "vck_checkout_draft";
const EMPTY: Values = { name: "", phone: "", email: "", provinceCode: "", wardCode: "", address: "", note: "", payment: "cod" };
const FIELD_ORDER: (keyof Values)[] = ["name", "phone", "email", "provinceCode", "wardCode", "address"];

function contactErrors(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Nhập họ tên người nhận";
  if (!isVnPhone(v.phone)) e.phone = "Số điện thoại chưa đúng (ví dụ 0912 345 678)";
  if (!v.email.includes("@")) e.email = "Nhập email để nhận thông báo đơn hàng";
  if (!v.provinceCode) e.provinceCode = "Chọn tỉnh/thành phố";
  if (!v.wardCode) e.wardCode = "Chọn phường/xã";
  if (!v.address.trim()) e.address = "Nhập số nhà, tên đường";
  return e;
}

function StepCard({ n, title, state, summary, onEdit, children }: { n: number; title: string; state: "active" | "done" | "todo"; summary?: ReactNode; onEdit?: () => void; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className={cn("rounded-lg border bg-card transition-opacity duration-[var(--dur-base)]", state === "active" ? "border-primary shadow-sm" : "border-border", state === "todo" && "opacity-60")}>
      <header className="flex items-center gap-3 p-4 md:px-6">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-small font-semibold", state === "todo" ? "bg-muted text-muted-foreground" : "bg-primary text-on-primary")}>
          {state === "done" ? <Check className="size-4" aria-hidden /> : n}
        </span>
        <h2 id={`step-${n}`} className="flex-1 text-body font-semibold text-heading">{title}</h2>
        {state === "done" && onEdit && <button type="button" onClick={onEdit} className="cursor-pointer text-small font-medium text-primary underline-offset-4 hover:underline">Sửa</button>}
      </header>
      {state === "done" && summary && <div className="px-4 pb-4 pl-14 text-small text-muted-foreground md:px-6 md:pl-16">{summary}</div>}
      {state === "active" && <div className="px-4 pb-5 md:px-6 md:pl-16">{children}</div>}
    </section>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-caption text-destructive">{error}</p>}
    </div>
  );
}

const PAYMENTS: { value: PaymentMethod; icon: typeof Banknote; title: string; note: string }[] = [
  { value: "cod", icon: Banknote, title: "Thanh toán khi nhận hàng (COD)", note: "Trả tiền mặt cho shipper, được kiểm tra hàng trước." },
  { value: "vnpay", icon: CreditCard, title: "VNPay", note: "Thẻ ATM nội địa, thẻ quốc tế hoặc quét QR qua ngân hàng." },
];

export function CheckoutForm({ cart, provinces, shippingOptions, initialPayment }: { cart: Cart; provinces: Unit[]; shippingOptions: ShippingOption[]; initialPayment?: PaymentMethod | undefined }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [wards, setWards] = useState<Unit[]>([]);
  const [busy, setBusy] = useState(false);
  const [shippingId, setShippingId] = useState(shippingOptions[0]?.id ?? "");
  const summaryRef = useRef<HTMLDivElement>(null);

  const shipping = shippingOptions.find((o) => o.id === shippingId);
  const total = (cart.subtotal ?? 0) + (shipping?.amount ?? 0);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  // Restore the draft (kept after a failed or cancelled payment so the shopper does not retype).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = { ...EMPTY, ...(JSON.parse(raw) as Partial<Values>), ...(initialPayment && { payment: initialPayment }) };
      setV(d);
      if (d.provinceCode) void loadWards(d.provinceCode).then(setWards);
    } catch {
      /* private mode or bad draft: start empty */
    }
  }, []);

  useEffect(() => {
    if (v === EMPTY) return; // untouched: do not overwrite a draft that is about to be restored (dev double-mount)
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [v]);

  const pickProvince = (code: string) => {
    setV((p) => ({ ...p, provinceCode: code, wardCode: "" }));
    setWards([]);
    void loadWards(code).then(setWards);
  };

  const toShipping = () => {
    const e = contactErrors(v);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setBusy(true);
    const res = await placeOrder({ ...v, shippingOptionId: shippingId });
    if (res.ok) {
      if (res.next.startsWith("/")) router.push(res.next);
      else window.location.assign(res.next);
      return; // keep the button busy while navigating
    }
    setBusy(false);
    setErrors(res.errors);
    if (FIELD_ORDER.some((k) => res.errors[k])) setStep(1);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const primary = step === 1 ? { label: "Tiếp tục", run: toShipping } : step === 2 ? { label: "Tiếp tục", run: () => setStep(3) } : { label: `Đặt hàng · ${formatVnd(total)}`, run: submit };
  const err = (k: keyof Values) => errors[k];
  const inv = (k: keyof Values) => (err(k) ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});
  const shown = Object.entries(errors).filter(([, m]) => m);

  const cta = (cls: string) => (
    <Button type="button" variant="cta" size="lg" disabled={busy} onClick={primary.run} className={cls}>
      {busy && <Loader2 className="animate-spin" aria-hidden />}
      {primary.label}
    </Button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <details className="group rounded-lg border border-border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-small font-medium">
          <span>Đơn hàng ({cart.items?.reduce((n, i) => n + i.quantity, 0)} sản phẩm)</span>
          <span className="font-bold tabular-nums">{formatVnd(total)}</span>
        </summary>
        <div className="border-t border-border p-4"><OrderSummary cart={cart} shipping={shipping?.amount ?? null} /></div>
      </details>

      <form className="space-y-4 lg:col-span-7" noValidate onSubmit={(e) => { e.preventDefault(); primary.run(); }}>
        <AnimatePresence>
          {shown.length > 0 && (
            <motion.div ref={summaryRef} tabIndex={-1} role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border border-destructive bg-card p-4 text-small outline-none">
              <p className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-4" aria-hidden />{errors.form ?? "Vui lòng kiểm tra lại thông tin"}</p>
              {!errors.form && (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {shown.map(([k, m]) => <li key={k}><a className="underline-offset-4 hover:underline" href={`#${k}`}>{m}</a></li>)}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <StepCard n={1} title="Thông tin nhận hàng" state={step === 1 ? "active" : "done"} onEdit={() => setStep(1)} summary={<>{v.name} · {v.phone}<br />{[v.address, wards.find((w) => w.code === v.wardCode)?.name, provinces.find((p) => p.code === v.provinceCode)?.name].filter(Boolean).join(", ")}</>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Họ và tên" error={err("name")}><Input id="name" autoComplete="name" value={v.name} onChange={(e) => set("name", e.target.value)} className="h-11 bg-card" {...inv("name")} /></Field>
            <Field id="phone" label="Số điện thoại" error={err("phone")}><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} className="h-11 bg-card" {...inv("phone")} /></Field>
            <div className="sm:col-span-2"><Field id="email" label="Email" error={err("email")}><Input id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} className="h-11 bg-card" {...inv("email")} /></Field></div>
            <Field id="provinceCode" label="Tỉnh / Thành phố" error={err("provinceCode")}>
              <UnitCombobox id="provinceCode" label="Tỉnh / Thành phố" placeholder="Chọn tỉnh/thành phố" units={provinces} value={v.provinceCode} onChange={pickProvince} invalid={!!err("provinceCode")} describedBy={err("provinceCode") ? "provinceCode-error" : undefined} />
            </Field>
            <Field id="wardCode" label="Phường / Xã" error={err("wardCode")}>
              <UnitCombobox id="wardCode" label="Phường / Xã" placeholder={v.provinceCode ? "Chọn phường/xã" : "Chọn tỉnh trước"} units={wards} value={v.wardCode} onChange={(c) => set("wardCode", c)} disabled={!v.provinceCode} invalid={!!err("wardCode")} describedBy={err("wardCode") ? "wardCode-error" : undefined} />
            </Field>
            <div className="sm:col-span-2"><Field id="address" label="Số nhà, tên đường" error={err("address")}><Input id="address" autoComplete="street-address" value={v.address} onChange={(e) => set("address", e.target.value)} className="h-11 bg-card" {...inv("address")} /></Field></div>
            <div className="sm:col-span-2"><Field id="note" label="Ghi chú (không bắt buộc)"><Textarea id="note" rows={2} className="bg-card" value={v.note} onChange={(e) => set("note", e.target.value)} /></Field></div>
          </div>
          <div className="mt-5 hidden justify-end md:flex">{cta("min-w-72")}</div>
        </StepCard>

        <StepCard n={2} title="Vận chuyển" state={step === 2 ? "active" : step > 2 ? "done" : "todo"} onEdit={() => setStep(2)} summary={shipping && <>{shipping.name} · {formatVnd(shipping.amount)}</>}>
          <RadioGroup value={shippingId} onValueChange={setShippingId} className="gap-3">
            {shippingOptions.map((o) => (
              <Label key={o.id} htmlFor={`ship-${o.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary">
                <RadioGroupItem id={`ship-${o.id}`} value={o.id} />
                <span className="flex-1 text-small font-medium">{o.name}</span>
                <span className="text-small font-semibold tabular-nums">{formatVnd(o.amount)}</span>
              </Label>
            ))}
          </RadioGroup>
          <div className="mt-5 hidden justify-end md:flex">{cta("min-w-72")}</div>
        </StepCard>

        <StepCard n={3} title="Thanh toán" state={step === 3 ? "active" : "todo"}>
          <RadioGroup value={v.payment} onValueChange={(p) => set("payment", p as PaymentMethod)} className="gap-3" aria-label="Phương thức thanh toán">
            {PAYMENTS.map(({ value, icon: Icon, title, note }) => (
              <Label key={value} htmlFor={`pay-${value}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 transition-colors duration-[var(--dur-fast)] has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary">
                <RadioGroupItem id={`pay-${value}`} value={value} className="mt-1" />
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span className="space-y-0.5">
                  <span className="block text-small font-semibold">{title}</span>
                  <span className="block text-caption font-normal text-muted-foreground">{note}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <div className="mt-5 hidden justify-end md:flex">{cta("min-w-72")}</div>
        </StepCard>
      </form>

      <aside className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-24 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-body font-semibold text-heading">Đơn hàng của bạn</h2>
          <OrderSummary cart={cart} shipping={shipping && step > 1 ? shipping.amount : null} />
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur md:hidden">{cta("w-full")}</div>
    </div>
  );
}
