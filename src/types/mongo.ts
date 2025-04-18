import { mongoose } from '../config/db';

export type DbResponse<T = any> = {
  status: boolean;
  data?: T | null;
  message?: string;
  error?: any;
};

export type DbOptions = {
  session: mongoose.ClientSession | null;
  populate?: mongoose.PopulateOptions | mongoose.PopulateOptions[];
  page?: number;
  limit?: number;
  devMode?: boolean;
  select?: string;
};
