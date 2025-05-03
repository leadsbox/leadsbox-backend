import { mongoose, Schema } from '../config/db';
import { DefaultDate, UserProvider } from '../types';
import { LeadType } from '../types/leads';
import { TransactionSchema } from './transaction.model';

export type LeadDocument = LeadType & mongoose.Document;

const LeadSchema = new Schema<LeadDocument>(
  {
    conversationId: { type: String, required: true },
    userId: { type: String, ref: 'User', required: true },
    transactions: { type: [TransactionSchema], default: [] },
    provider: {
      type: String,
      required: true,
      enum: Object.values(UserProvider),
      unique: true,
    },
    providerId: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

LeadSchema.set('toJSON', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<LeadDocument & DefaultDate>
  ) {
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
