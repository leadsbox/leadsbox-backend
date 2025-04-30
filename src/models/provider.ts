import { mongoose } from '../config/db';
import { ProviderType, UserProvider } from '../types';
import { DefaultDate } from '../types/user';

export type ProviderDocument = ProviderType & mongoose.Document;

const providerSchema = new mongoose.Schema<ProviderDocument>(
  {
    userId: { type: String, ref: 'User', required: true },
    provider: {
      type: String,
      required: false,
      enum: Object.values(UserProvider),
      unique: true,
    },
    providerId: { type: String, required: false },
    username: { type: String, required: false, unique: true },
    email: { type: String, required: true, unique: true },
    token: { type: String, required: false },
    tokenExpires: { type: Date, required: false },
    wabaId: { type: String, required: false },
    phoneId: { type: String, required: false },
    pageId: { type: String, required: false },
    igUserId: { type: String, required: false },
    botToken: { type: String, required: false },
    chatId: { type: String, required: false },
    webhookSubscribed: { type: Boolean, required: false, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

providerSchema.set('toJSON', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<ProviderDocument & DefaultDate>
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

providerSchema.set('toObject', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<ProviderDocument & DefaultDate>
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

const UserModel = mongoose.model<ProviderDocument>('User', providerSchema);

export { UserModel, providerSchema };
