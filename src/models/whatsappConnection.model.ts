import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsappConnection extends Document {
  userId: mongoose.Types.ObjectId;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsappConnectionSchema = new Schema<IWhatsappConnection>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  wabaId: { type: String, required: true },
  phoneNumberId: { type: String, required: true },
  accessToken: { type: String, required: true },
}, { timestamps: true });

export const WhatsappConnection = mongoose.model<IWhatsappConnection>(
  'WhatsappConnection',
  WhatsappConnectionSchema
);
