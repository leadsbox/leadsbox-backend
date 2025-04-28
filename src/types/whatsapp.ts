import { mongoose } from "../config/db";

export interface WhatsappConnectionType extends Document {
  userId?: string
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
}