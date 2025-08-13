import { mongoose, Schema } from '../config/db';

export interface IReceipt extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  receiptNumber: string;
  amount: number;
  sellerName: string;
  buyerName: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    receiptNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    sellerName: { type: String, required: true },
    buyerName: { type: String, required: true },
  },
  { timestamps: true }
);

const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);

export default Receipt;
