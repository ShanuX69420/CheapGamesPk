export const CURRENCY = process.env.NEXT_PUBLIC_STORE_CURRENCY ?? "PKR";

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function money(value: string | number): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(amount) ? formatter.format(amount) : "—";
}

export function releaseYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}
