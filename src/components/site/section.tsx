import { Reveal } from "./reveal";

export function SectionHeading({ eyebrow, title, intro, center = false }: { eyebrow: string; title: React.ReactNode; intro?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 text-3xl font-extrabold leading-[1.1] sm:text-4xl lg:text-[2.75rem]">{title}</h2>
      {intro && <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{intro}</p>}
    </Reveal>
  );
}

export function MeshBackground({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -left-32 -top-24 size-[34rem] animate-blob rounded-full bg-mint-200/70 blur-3xl will-change-transform" />
      <div className="absolute -right-24 top-10 size-[30rem] animate-blob rounded-full bg-lavender-200/70 blur-3xl will-change-transform [animation-delay:-7s]" />
      <div className="absolute bottom-[-10rem] left-1/3 size-[28rem] animate-blob rounded-full bg-teal-100/80 blur-3xl will-change-transform [animation-delay:-14s]" />
    </div>
  );
}
