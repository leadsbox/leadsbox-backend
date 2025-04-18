import { mongoose, Schema } from '../config/db';
import { IFollowUp, DefaultDate } from '../types/followup';

export type FollowUpDocument = IFollowUp & mongoose.Document;

const FollowUpSchema = new Schema<FollowUpDocument>(
  {
    conversationId: { type: String, required: true },
    followUpTime: { type: Date, required: true },
    status: { type: String, required: true, default: 'scheduled' },
    notes: { type: String },
  },
  { timestamps: true },
);

FollowUpSchema.set('toJSON', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<FollowUpDocument & DefaultDate>,
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

const FollowUpModel = mongoose.model<FollowUpDocument>(
  'FollowUp',
  FollowUpSchema,
);

export { FollowUpModel, FollowUpSchema };
