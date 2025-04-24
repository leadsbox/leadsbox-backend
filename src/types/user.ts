import { mongoose } from '../config/db';

export type UserType = {
  _id?: string;
  userId: string | mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  token?: string;
  provider?: UserProvider
  providerId?: string;
};

export type DefaultDate = { createdAt: Date; updatedAt: Date };

export interface TokenPayload {
  userId: string;
  email?: string;
  username?: string;
  exp?: number;
}

export enum UserProvider {
  LEADSBOX = 'LeadsBox',
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  TELEGRAM = 'Telegram',
  WHATSAPP = 'WhatsApp',
  TWITTER = 'Twitter',
  GOOGLE = 'Google',
}
