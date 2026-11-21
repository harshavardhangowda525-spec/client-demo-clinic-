import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 shadow-[inset_0_1px_0_rgb(11_21_48/.02)] transition focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:opacity-60 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, "h-11", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-24 py-2.5", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(base, "h-11 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2355627f' stroke-width='2'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...p} />
));
Select.displayName = "Select";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...p} />;
}

export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string; htmlFor: string; error?: string | null; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>
        : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-teal-500" : "bg-ink/15")}>
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
    </button>
  );
}
