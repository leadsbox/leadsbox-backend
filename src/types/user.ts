import { Document } from '../config/db';
export interface IUser extends Document {
  username: string;
  userId: string;
  email: string;
  password: string;
  checkPassword(enteredPassword: string): boolean;
  token?: string;
}

export type DefaultDate = { createdAt: Date; updatedAt: Date };

export interface TokenPayload {
  userId: string;
  email?: string;
  username?: string;
  exp?: number;
}