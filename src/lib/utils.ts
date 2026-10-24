import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Host display preference: show amounts without decimals ("165 €" instead of "165,00 €").
 * Loaded from portal_settings.hide_decimals by HostLayout and cached in localStorage
 * so the first render already uses the right format.
 */
const HIDE_DECIMALS_KEY = "money_hide_decimals";
let hideDecimals = (() => {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(HIDE_DECIMALS_KEY) === "1";
  } catch {
    return false;
  }
})();

export function getHideDecimals(): boolean {
  return hideDecimals;
}

export function setHideDecimals(value: boolean): void {
  hideDecimals = value;
  try {
    window.localStorage.setItem(HIDE_DECIMALS_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Format a number as euros with French formatting:
 * space for thousands separator, comma for decimals.
 * e.g. 1234.50 → "1 234,50 €" (or "1 235 €" when decimals are hidden)
 */
export function formatEuro(amount: number | string | null | undefined, opts?: { hideDecimals?: boolean }): string {
  const n = Number(amount) || 0;
  const hide = opts?.hideDecimals ?? hideDecimals;
  const abs = Math.abs(n);
  const fixed = hide ? String(Math.round(abs)) : abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  const sign = n < 0 && fixed !== "0" && fixed !== "0.00" ? "-" : "";
  return hide ? `${sign}${withSpaces} €` : `${sign}${withSpaces},${decPart} €`;
}

/** Number only (no € sign), respecting the decimals preference. */
export function formatAmountNumber(amount: number | string | null | undefined): string {
  return formatEuro(amount).replace(/\s?€$/, "");
}
