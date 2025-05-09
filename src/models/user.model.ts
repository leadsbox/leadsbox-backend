import { mongoose } from '../config/db';
import { UserProvider } from '../types';
import { UserType, DefaultDate } from '../types/user';

export type UserDocument = UserType & mongoose.Document;

const userSchema = new mongoose.Schema<UserDocument>(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: false, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    token: { type: String, required: false },
    provider: {
      type: String,
      required: false,
      enum: Object.values(UserProvider),
    },
    providerId: { type: String, required: false },
    profileImage: { type: String, required: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

userSchema.set('toJSON', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<UserDocument & DefaultDate>
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

userSchema.set('toObject', {
  transform: function (
    doc: mongoose.Document,
    ret: Partial<UserDocument & DefaultDate>
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

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

const UserModel = mongoose.model<UserDocument>('User', userSchema);

export { UserModel, userSchema };
