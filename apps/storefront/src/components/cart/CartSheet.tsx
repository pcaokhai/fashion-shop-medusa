"use client";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Cart } from "@/lib/data";
import { CartLines } from "./CartLines";

/** Wrap the header's cart button: `<CartSheet cart={cart}>{button}</CartSheet>`. The button must accept a ref and onClick. */
export function CartSheet({ cart, children }: { cart: Cart | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const count = cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-h4 text-heading">Giỏ hàng{count > 0 && ` (${count})`}</SheetTitle>
          <SheetDescription className="sr-only">Các sản phẩm bạn đã chọn</SheetDescription>
        </SheetHeader>
        <CartLines cart={cart} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
