"use client";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fold } from "@/lib/fold";
import { cn } from "@/lib/utils";
import type { Unit } from "@/lib/data/checkout";

interface Props {
  id: string;
  label: string;
  placeholder: string;
  units: Unit[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
}

export function UnitCombobox({ id, label, placeholder, units, value, onChange, disabled, invalid, describedBy }: Props) {
  const [open, setOpen] = useState(false);
  const current = units.find((u) => u.code === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-small outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
            !current && "text-muted-foreground",
          )}
        >
          <span className="truncate">{current?.name ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command filter={(v, search) => (fold(v).includes(fold(search)) ? 1 : 0)}>
          <CommandInput placeholder="Gõ để tìm (không cần dấu)…" />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              {units.map((u) => (
                <CommandItem
                  key={u.code}
                  value={u.name}
                  onSelect={() => {
                    onChange(u.code);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", u.code === value ? "opacity-100" : "opacity-0")} aria-hidden />
                  {u.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
