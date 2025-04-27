import { Schema } from 'mongoose';
import { LeadLabel } from '../types/leads';

export const TransactionSchema = new Schema({
  tag: { type: String, required: true, enum: Object.values(LeadLabel) },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});
