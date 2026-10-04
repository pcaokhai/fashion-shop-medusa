"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 150; // pages/search.md

/** Instant search: the URL ?q= is the state, the server page renders results. */
export function SearchInput({ initial }: { initial: string }) {
  const router = useRouter();
  const path = usePathname();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => router.replace(value.trim() ? `${path}?q=${encodeURIComponent(value.trim())}` : path, { scroll: false }), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, router, path]);

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input type="search" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Tìm áo thun, quần jeans, váy…" aria-label="Tìm kiếm sản phẩm" className="h-14 w-full rounded-full border border-border bg-card pr-12 pl-12 text-lead focus-visible:border-primary [&::-webkit-search-cancel-button]:hidden" />
      {value && (
        <button type="button" aria-label="Xoá" onClick={() => setValue("")} className="absolute top-1/2 right-2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full hover:bg-muted"><X className="size-5" /></button>
      )}
    </div>
  );
}
