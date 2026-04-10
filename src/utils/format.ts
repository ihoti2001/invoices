export function formatCurrency(amount: number, currency = "GBP"): string {
  return amount.toLocaleString("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}
