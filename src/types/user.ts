import { mongoose } from '../config/db';
import { UserProvider } from './provider';

export type UserType = {
  _id?: string;
  userId: string | mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string | null;
  token?: string;
  provider?: UserProvider;
  providerId?: string;
  profileImage?: string;
};

export type DefaultDate = { createdAt: Date; updatedAt: Date };

export interface TokenPayload {
  userId: string;
  email?: string;
  username?: string;
  exp?: number;
}
