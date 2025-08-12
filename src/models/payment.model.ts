import { Schema, model, Types } from 'mongoose';

export interface Payment {
  orgId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  method: 'bank_transfer_manual' | 'gateway' | 'va';
  ref?: string;
  amount: number;
  paidAt: Date;
  createdFromClaim?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema = new Schema<Payment>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, required: true, index: true },
  method: { type: String, enum: ['bank_transfer_manual','gateway','va'], default: 'bank_transfer_manual' },
  ref: { type: String },
  amount: { type: Number, required: true, min: 0 },
  paidAt: { type: Date, default: Date.now },
  createdFromClaim: { type: Schema.Types.ObjectId }
}, { timestamps: true });

PaymentSchema.index({ orgId: 1, ref: 1 }, { unique: true, sparse: true });

export default model<Payment>('Payment', PaymentSchema);
