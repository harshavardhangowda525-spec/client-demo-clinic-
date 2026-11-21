import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block size-4">
            <Star className="absolute inset-0 size-4 text-amber-300" strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function GoogleRating({ rating, count, href, className }: { rating: number | null; count: number | null; href?: string | null; className?: string }) {
  if (!rating) return null;
  const body = (
    <>
      <span className="font-display text-2xl font-extrabold leading-none text-ink">{rating.toFixed(1)}</span>
      <span className="flex flex-col">
        <Stars value={rating} />
        <span className="mt-1 text-xs text-muted">{count ? `${count} Google reviews` : "Google rating"}</span>
      </span>
    </>
  );
  const cls = cn("inline-flex items-center gap-3", className);
  const label = `Rated ${rating.toFixed(1)} out of 5 on Google${count ? ` from ${count} reviews` : ""}`;
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>{body}</a> : <div aria-label={label} className={cls}>{body}</div>;
}
