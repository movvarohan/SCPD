import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullNameOf(lead: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (lead.fullName && lead.fullName.trim()) return lead.fullName.trim();
  const parts = [lead.firstName, lead.lastName].filter(Boolean);
  return parts.join(" ").trim() || "Unknown";
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function bestEmailOf(lead: {
  email?: string | null;
  workEmail?: string | null;
  personalEmail?: string | null;
}): string | null {
  return lead.email || lead.workEmail || lead.personalEmail || null;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function pct(numerator: number, denominator: number): string {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// Normalisation helpers used by dedupe.
export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function normalizeLinkedin(url?: string | null): string {
  if (!url) return "";
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .replace(/\?.*$/, "");
}

export function normalizeText(text?: string | null): string {
  return (text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
