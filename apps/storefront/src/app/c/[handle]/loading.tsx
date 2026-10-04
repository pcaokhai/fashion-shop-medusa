import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[var(--layout-max)] px-4 md:px-6">
      <Skeleton className="mt-4 h-48 rounded-xl md:mt-6" />
      <Skeleton className="mt-4 h-14" />
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 min-[90rem]:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i}><Skeleton className="aspect-[4/5] rounded-lg" /><Skeleton className="mt-3 h-4 w-3/4" /><Skeleton className="mt-2 h-4 w-1/3" /></div>
        ))}
      </div>
    </div>
  );
}
