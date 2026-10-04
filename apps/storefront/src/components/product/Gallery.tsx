"use client";
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => setIndex(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    return () => void api.off("select", sync);
  }, [api]);

  return (
    <div className="md:grid md:grid-cols-[5rem_1fr] md:gap-3">
      <div className="hidden flex-col gap-3 md:flex">
        {images.map((src, i) => (
          <button key={src} type="button" onClick={() => api?.scrollTo(i)} aria-label={`Ảnh ${i + 1}`} aria-current={i === index} className={cn("aspect-[4/5] cursor-pointer overflow-hidden rounded-md border-2 transition-colors", i === index ? "border-foreground" : "border-transparent")}>
            <img src={src} alt="" width={160} height={200} className="size-full object-cover" />
          </button>
        ))}
      </div>
      <div className="relative">
        <Carousel setApi={setApi} className="overflow-hidden rounded-lg">
          <CarouselContent className="ml-0">
            {images.map((src, i) => (
              <CarouselItem key={src} className="pl-0">
                <img src={src} alt={`${title}, ảnh ${i + 1}`} width={800} height={1000} {...(i === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} className="aspect-[4/5] w-full object-cover" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
          {images.map((src, i) => <span key={src} className={cn("h-1.5 rounded-full bg-card transition-[width,opacity]", i === index ? "w-5" : "w-1.5 opacity-60")} />)}
        </div>
      </div>
    </div>
  );
}
