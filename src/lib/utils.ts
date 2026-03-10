import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as euros with French formatting:
 * space for thousands separator, comma for decimals.
 * e.g. 1234.50 → "1 234,50 €"
 */
export function formatEuro(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  const sign = amount < 0 ? "-" : "";
  return `${sign}${withSpaces},${decPart} €`;
}
