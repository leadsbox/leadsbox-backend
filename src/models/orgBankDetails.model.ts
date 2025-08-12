import { Schema, model, Types } from 'mongoose';

export interface OrgBankDetails {
  orgId: Types.ObjectId;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrgBankDetailsSchema = new Schema<OrgBankDetails>({
  orgId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  bankName: { type: String, required: true },
  accountName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  notes: { type: String }
}, { timestamps: true });

export default model<OrgBankDetails>('OrgBankDetails', OrgBankDetailsSchema);
