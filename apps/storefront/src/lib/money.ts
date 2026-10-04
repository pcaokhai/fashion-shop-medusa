const VND = new Intl.NumberFormat("vi-VN");

/** Integer VND → "259.000 ₫". The only place money becomes a string (CLAUDE.md rule 1). */
export function formatVnd(amount: number): string {
  if (!Number.isInteger(amount)) throw new Error(`VND amount must be an integer, got ${amount}`);
  return `${VND.format(amount)} ₫`;
}
