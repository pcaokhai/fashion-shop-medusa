"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
];
const PRICES = [
  { value: "200000", label: "Dưới 200.000 ₫" },
  { value: "400000", label: "Dưới 400.000 ₫" },
];

/** Filter state lives in the URL (?sort=&sale=1&stock=1&max=), so pages stay shareable and crawlable. */
export function FilterBar({ total }: { total: number }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    start(() => router.push(`${path}?${next}`, { scroll: false }));
  };
  const toggle = (key: string) => set({ [key]: params.get(key) ? null : "1" });
  const active = ["sale", "stock", "max"].filter((k) => params.get(k)).length;

  const chip = (on: boolean) =>
    cn("inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border px-4 text-small font-medium transition-colors", on ? "border-primary bg-primary-tint text-primary" : "border-border bg-card hover:bg-muted");
  const chips = (
    <>
      <button type="button" aria-pressed={!!params.get("sale")} onClick={() => toggle("sale")} className={chip(!!params.get("sale"))}>
        {params.get("sale") && <Check className="size-4" />} Đang giảm giá
      </button>
      <button type="button" aria-pressed={!!params.get("stock")} onClick={() => toggle("stock")} className={chip(!!params.get("stock"))}>
        {params.get("stock") && <Check className="size-4" />} Còn hàng
      </button>
      {PRICES.map((p) => (
        <button key={p.value} type="button" aria-pressed={params.get("max") === p.value} onClick={() => set({ max: params.get("max") === p.value ? null : p.value })} className={chip(params.get("max") === p.value)}>
          {params.get("max") === p.value && <Check className="size-4" />} {p.label}
        </button>
      ))}
    </>
  );
  const sort = (
    <select aria-label="Sắp xếp" value={params.get("sort") ?? "newest"} onChange={(e) => set({ sort: e.target.value === "newest" ? null : e.target.value })} className="h-9 cursor-pointer rounded-full border border-border bg-card px-3 text-small font-medium">
      {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );

  return (
    <div className={cn("sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:border", pending && "opacity-70")}>
      <div className="flex items-center gap-2">
        <p aria-live="polite" className="mr-auto text-small text-muted-foreground">{total} sản phẩm</p>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {chips}
          {active > 0 && <button type="button" onClick={() => set({ sale: null, stock: null, max: null })} className="cursor-pointer text-small font-medium text-primary underline">Xoá lọc ({active})</button>}
        </div>
        {sort}
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 rounded-full md:hidden"><SlidersHorizontal /> Lọc{active > 0 && ` (${active})`}</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Bộ lọc</DrawerTitle></DrawerHeader>
            <div className="flex flex-wrap gap-2 px-4 pb-2">{chips}</div>
            <DrawerFooter>
              <DrawerClose asChild><Button variant="cta">Xem {total} sản phẩm</Button></DrawerClose>
              {active > 0 && <Button variant="ghost" onClick={() => set({ sale: null, stock: null, max: null })}>Đặt lại</Button>}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
