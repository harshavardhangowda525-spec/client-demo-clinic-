"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({ open, onOpenChange, title, description, children, side = "right" }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: React.ReactNode; side?: "right" | "center";
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[fade_.2s_ease]" />
        <D.Content
          className={cn("fixed z-50 flex flex-col bg-white shadow-lift focus:outline-none",
            side === "right"
              ? "inset-y-0 right-0 w-full max-w-lg data-[state=open]:animate-[slidein_.28s_cubic-bezier(.22,1,.36,1)]"
              : "left-1/2 top-1/2 max-h-[92vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=open]:animate-[pop_.22s_ease]")}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <D.Title className="font-display text-lg font-bold">{title}</D.Title>
              {description ? <D.Description className="text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close"><X className="size-5" /></D.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
