export function generateInvoiceCode(): string {
  // e.g., INV-8X2M
  return `INV-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}
