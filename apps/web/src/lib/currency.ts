export const WELL_KNOWN_CURRENCIES: Record<
  string,
  { symbol: string; name: string; defaultLocale: string }
> = {
  INR: { symbol: "₹", name: "Indian Rupee", defaultLocale: "en-IN" },
  USD: { symbol: "$", name: "US Dollar", defaultLocale: "en-US" },
  EUR: { symbol: "€", name: "Euro", defaultLocale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", defaultLocale: "en-GB" },
  CAD: { symbol: "CA$", name: "Canadian Dollar", defaultLocale: "en-CA" },
  AUD: { symbol: "A$", name: "Australian Dollar", defaultLocale: "en-AU" },
  JPY: { symbol: "¥", name: "Japanese Yen", defaultLocale: "ja-JP" },
  AED: { symbol: "AED", name: "UAE Dirham", defaultLocale: "en-AE" },
  SGD: { symbol: "S$", name: "Singapore Dollar", defaultLocale: "en-SG" },
  SAR: { symbol: "SAR", name: "Saudi Riyal", defaultLocale: "en-SA" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", defaultLocale: "en-NZ" },
  CHF: { symbol: "CHF", name: "Swiss Franc", defaultLocale: "de-CH" },
};

export const COMMON_CURRENCY_OPTIONS = [
  { code: "INR", label: "INR - Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", label: "USD - US Dollar ($)", symbol: "$" },
  { code: "EUR", label: "EUR - Euro (€)", symbol: "€" },
  { code: "GBP", label: "GBP - British Pound (£)", symbol: "£" },
  { code: "AED", label: "AED - UAE Dirham (AED)", symbol: "AED" },
  { code: "AUD", label: "AUD - Australian Dollar (A$)", symbol: "A$" },
  { code: "CAD", label: "CAD - Canadian Dollar (CA$)", symbol: "CA$" },
  { code: "SGD", label: "SGD - Singapore Dollar (S$)", symbol: "S$" },
];

/**
 * Returns the short symbol for a given currency code (e.g. "INR" -> "₹", "USD" -> "$").
 */
export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return "₹";
  const upper = currencyCode.toUpperCase().trim();
  if (WELL_KNOWN_CURRENCIES[upper]) {
    return WELL_KNOWN_CURRENCIES[upper].symbol;
  }
  try {
    const parts = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: upper,
    }).formatToParts(1);
    const symbolPart = parts.find((p) => p.type === "currency");
    return symbolPart ? symbolPart.value : upper;
  } catch {
    return upper;
  }
}

export interface FormatCurrencyOptions {
  fallback?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formats a monetary amount using the tenant's currency code and locale.
 * E.g., formatCurrency(1250, "INR") -> "₹1,250.00"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = "INR",
  locale?: string,
  options?: FormatCurrencyOptions,
): string {
  const fallback = options?.fallback ?? "—";
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return fallback;
  }

  const num = Number(amount);
  const code = (currencyCode || "INR").toUpperCase().trim();
  const targetLocale =
    locale || (code === "INR" ? "en-IN" : WELL_KNOWN_CURRENCIES[code]?.defaultLocale || "en-US");

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(num);
  } catch {
    const sym = getCurrencySymbol(code);
    return `${sym}${num.toFixed(options?.maximumFractionDigits ?? 2)}`;
  }
}
