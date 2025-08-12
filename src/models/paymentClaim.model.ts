import { Schema, model, Types } from 'mongoose';

export interface PaymentClaim {
  orgId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  amountClaimed: number;
  refText?: string;
  payerBank?: string;
  payerName?: string;
  proofFileUrl?: string;
  source: 'buyer' | 'staff';
  status: 'pending' | 'approved' | 'rejected' | 'partial';
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentClaimSchema = new Schema<PaymentClaim>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, required: true, index: true },
  amountClaimed: { type: Number, required: true, min: 0 },
  refText: String,
  payerBank: String,
  payerName: String,
  proofFileUrl: String,
  source: { type: String, enum: ['buyer','staff'], default: 'buyer' },
  status: { type: String, enum: ['pending','approved','rejected','partial'], default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId },
  reviewedAt: Date,
  reviewNote: String
}, { timestamps: true });

export default model<PaymentClaim>('PaymentClaim', PaymentClaimSchema);
