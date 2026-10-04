import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-[var(--layout-max)] gap-8 px-4 py-6 md:grid-cols-12 md:px-6">
      <Skeleton className="aspect-[4/5] md:col-span-7" />
      <div className="space-y-4 md:col-span-5"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-10 w-1/3" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
    </div>
  );
}
