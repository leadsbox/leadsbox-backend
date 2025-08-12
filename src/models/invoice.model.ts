import { Schema, model, Types } from 'mongoose';

export interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  orgId: Types.ObjectId;
  contactId: Types.ObjectId;
  contactPhone?: string;
  code: string;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'void';
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceItemSchema = new Schema<InvoiceItem>({
  name: { type: String, required: true },
  qty: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const InvoiceSchema = new Schema<Invoice>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  contactPhone: { type: String },
  code: { type: String, required: true },
  currency: { type: String, default: 'NGN' },
  items: { type: [InvoiceItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'sent', 'viewed', 'pending_confirmation', 'paid', 'partial', 'cancelled', 'void'], default: 'sent' }
}, { timestamps: true });

InvoiceSchema.index({ orgId: 1, code: 1 }, { unique: true });

export default model<Invoice>('Invoice', InvoiceSchema);
