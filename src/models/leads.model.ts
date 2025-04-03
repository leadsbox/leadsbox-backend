// models/lead.model.ts
import { mongoose, Schema } from '../config/db';
import { ILead, DefaultDate } from '../types/leads';

export type LeadDocument = ILead & mongoose.Document;

const LeadSchema = new Schema<LeadDocument>(
  {
    conversationId: { type: String, required: true, unique: true },
    tag: { type: String, required: true, default: 'New' },
    notes: { type: String },
    userId: { type: String, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

LeadSchema.set('toJSON', {
  transform: function (doc: mongoose.Document, ret: Partial<LeadDocument & DefaultDate>) {
    if (ret.createdAt) {
      ret.createdAt = ret.createdAt.toISOString() as any;
    }
    if (ret.updatedAt) {
      ret.updatedAt = ret.updatedAt.toISOString() as any;
    }
    return ret;
  },
});

const LeadModel = mongoose.model<LeadDocument>('Lead', LeadSchema);

export { LeadModel, LeadSchema };
