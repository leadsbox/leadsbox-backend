// models/user.model.ts
import { CryptoUtils } from '../utils/crypto';
import { mongoose } from '../config/db';
import { IUser, DefaultDate } from '../types/user';

export type UserDocument = IUser & mongoose.Document;

const userSchema = new mongoose.Schema<UserDocument>(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String, required: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

userSchema.set('toJSON', {
  transform: function (doc: mongoose.Document, ret: Partial<UserDocument & DefaultDate>) {
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
  transform: function (doc: mongoose.Document, ret: Partial<UserDocument & DefaultDate>) {
    if (ret.createdAt) {
      ret.createdAt = ret.createdAt.toISOString() as any;
    }
    if (ret.updatedAt) {
      ret.updatedAt = ret.updatedAt.toISOString() as any;
    }
    return ret;
  },
});

const UserModel = mongoose.model<UserDocument>('User', userSchema);

export { UserModel, userSchema };
