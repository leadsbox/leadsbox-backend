import { Schema, model } from 'mongoose';
import { LinkStateType } from '../types';

const LinkStateSchema = new Schema<LinkStateType>({
  state: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
LinkStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LinkStateModel = model<LinkStateType>(
  'LinkState',
  LinkStateSchema
);
