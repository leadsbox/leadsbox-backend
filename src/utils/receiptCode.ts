export function generateReceiptCode(): string {
  // e.g., RCPT-8X2M
  return `RCPT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
