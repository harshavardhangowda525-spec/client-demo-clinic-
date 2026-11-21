"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CircleCheck } from "lucide-react";

type T = { id: number; kind: "ok" | "err"; text: string };
const Ctx = createContext<(kind: T["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: T["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 5200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lift ${t.kind === "ok" ? "bg-ink text-white" : "bg-red-600 text-white"}`}>
              {t.kind === "ok" ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-glow" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
