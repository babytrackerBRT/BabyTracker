import { clsx } from "clsx";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return clsx(inputs);
}

export function formatTime(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function minutesToHuman(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function randomToken(len = 40) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
