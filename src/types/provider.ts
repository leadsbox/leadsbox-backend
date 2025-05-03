import { mongoose } from '../config/db';

export type ProviderType = {
  _id?: string;
  userId: string | mongoose.Types.ObjectId;
  provider?: UserProvider;
  providerId?: string;
  username?: string;
  email?: string;
  token?: string;
  tokenExpires?: Date;
  wabaId?: string;
  phoneId?: string;
  pageId?: string;
  igUserId?: string;
  botToken?: string;
  chatId?: string;
  webhookSubscribed?: boolean;
  profileImage?: string;
};

export enum UserProvider {
  LEADSBOX = 'LeadsBox',
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  TELEGRAM = 'Telegram',
  WHATSAPP = 'WhatsApp',
  TWITTER = 'Twitter',
  GOOGLE = 'Google',
}
