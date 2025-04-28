import mongoose, { Schema } from 'mongoose';
import { WhatsappConnectionType } from '../types';

export type WhatsappConnectionDocument = WhatsappConnectionType &
  mongoose.Document;

const WhatsappConnectionSchema = new Schema<WhatsappConnectionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wabaId: { type: String, required: true },
    phoneNumberId: { type: String, required: true },
    accessToken: { type: String, required: true },
  },
  { timestamps: true }
);

const WhatsappConnection = mongoose.model<WhatsappConnectionDocument>(
  'WhatsappConnection',
  WhatsappConnectionSchema
);

export { WhatsappConnection, WhatsappConnectionSchema };
