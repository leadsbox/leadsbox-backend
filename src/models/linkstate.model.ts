import { mongoose, Schema } from '../config/db';
import { LinkStateType } from '../types';
import { DefaultDate } from '../types';

export type LinkStateDocument = LinkStateType & mongoose.Document;

const LinkStateSchema = new Schema<LinkStateDocument>({
  state: { type: String, required: true, unique: true },
  userId: { type: String, required: true, ref: 'User' },
  expiresAt: { type: Date, required: true },
});

LinkStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

LinkStateSchema.set('toJSON', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<LinkStateDocument & DefaultDate>
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

const LinkStateModel = mongoose.model<LinkStateDocument>(
  'LinkState',
  LinkStateSchema
);

export { LinkStateModel, LinkStateSchema };
