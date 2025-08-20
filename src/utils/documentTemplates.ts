export interface ReceiptTemplateData {
  amount: number;
  currency?: string;
  status?: string;
  date: Date;
  sellerName: string;
  buyerName: string;
  receiptNumber: string;
  sessionId?: string;
}

export function generateReceiptHtml(data: ReceiptTemplateData): string {
  const {
    amount,
    currency = 'NGN',
    status = 'Successful',
    date,
    sellerName,
    buyerName,
    receiptNumber,
    sessionId = '',
  } = data;

  const formattedDate = new Date(date).toLocaleString();

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Transaction Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; }
      .header { text-align: center; }
      .amount { font-size: 32px; color: #008751; margin: 20px 0; }
      .section-title { font-weight: bold; margin-top: 20px; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h3>Transaction Receipt</h3>
        <div class="amount">${currency}${amount.toFixed(2)}</div>
        <div>${status}</div>
        <div>${formattedDate}</div>
      </div>
      <div class="section">
        <div class="section-title">Recipient Details</div>
        <div class="row"><span>${sellerName}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Sender Details</div>
        <div class="row"><span>${buyerName}</span></div>
      </div>
      <div class="section">
        <div class="row"><span>Transaction No.</span><span>${receiptNumber}</span></div>
        ${sessionId ? `<div class="row"><span>Session ID</span><span>${sessionId}</span></div>` : ''}
      </div>
      <div class="footer">
        Enjoy a better experience with LeadsBox. Thank you for your business.
      </div>
    </div>
  </body>
  </html>`;
}

export interface InvoiceTemplateData {
  code: string;
  amount: number;
  currency?: string;
  status?: string;
  date: Date;
  sellerName?: string;
  buyerName?: string;
}

export function generateInvoiceHtml(data: InvoiceTemplateData): string {
  const {
    code,
    amount,
    currency = 'NGN',
    status = 'Pending',
    date,
    sellerName = 'Seller',
    buyerName = 'Buyer',
  } = data;

  const formattedDate = new Date(date).toLocaleString();

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Invoice</title>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; }
      .header { text-align: center; }
      .amount { font-size: 32px; color: #008751; margin: 20px 0; }
      .section-title { font-weight: bold; margin-top: 20px; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h3>Invoice</h3>
        <div class="amount">${currency}${amount.toFixed(2)}</div>
        <div>${status}</div>
        <div>${formattedDate}</div>
      </div>
      <div class="section">
        <div class="section-title">Seller</div>
        <div class="row"><span>${sellerName}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Buyer</div>
        <div class="row"><span>${buyerName}</span></div>
      </div>
      <div class="section">
        <div class="row"><span>Invoice Code</span><span>${code}</span></div>
      </div>
      <div class="footer">
        Thank you for choosing LeadsBox.
      </div>
    </div>
  </body>
  </html>`;
}

