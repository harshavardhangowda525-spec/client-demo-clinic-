import "server-only";
import { formatDateLong, formatTime } from "./time";

export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Returns true only if the provider accepted the message. */
export async function sendEmail(to: string | string[], subject: string, html: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type Mail = {
  clinicName: string; clinicPhone: string; address: string; ref: string; patientName: string;
  serviceName: string; startsAt: string; status: string;
};

export function patientEmail(m: Mail, kind: "booked" | "rescheduled" | "cancelled") {
  const when = `${formatDateLong(m.startsAt)} at ${formatTime(m.startsAt)}`;
  const heading =
    kind === "cancelled" ? "Your appointment has been cancelled"
    : kind === "rescheduled" ? "Your appointment has been rescheduled"
    : m.status === "pending" ? "We've received your appointment request" : "Your appointment is confirmed";
  const subject = `${heading} – ${m.clinicName} (${m.ref})`;
  const rows: [string, string][] = [["Reference", m.ref], ["Service", m.serviceName], ["When", when], ["Where", m.address]];
  const text = `Hello ${m.patientName},\n\n${heading}.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nNeed to change something? Call us on ${m.clinicPhone}.\n\n${m.clinicName}`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;color:#13204a">
  <h2 style="margin:0 0 12px">${esc(heading)}</h2><p>Hello ${esc(m.patientName)},</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#5b6787;width:110px">${k}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`).join("")}</table>
  <p>Need to change something? Call us on <a href="tel:${esc(m.clinicPhone)}">${esc(m.clinicPhone)}</a>.</p>
  <p style="color:#5b6787">${esc(m.clinicName)}</p></div>`;
  return { subject, html, text };
}
