import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[var(--layout-max)] px-4 py-6 md:px-6">
      <Skeleton className="mx-auto h-14 max-w-2xl rounded-full" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
    </div>
  );
}
