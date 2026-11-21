import { Accessibility, Activity, Bone, Dumbbell, Footprints, Hand, HeartPulse, PersonStanding, Stethoscope, type LucideIcon } from "lucide-react";

export const SERVICE_ICONS: Record<string, LucideIcon> = {
  spine: Activity, shoulder: Accessibility, joint: Bone, ankle: Footprints, dumbbell: Dumbbell,
  stethoscope: Stethoscope, heart: HeartPulse, hand: Hand, person: PersonStanding, activity: Activity,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const I = SERVICE_ICONS[name] ?? Activity;
  return <I className={className} aria-hidden />;
}
