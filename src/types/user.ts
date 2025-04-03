// types/user.ts
export interface IUser {
  userId: string;
  username: string;
  email: string;
  password: string;
  token?: string;
}

export type DefaultDate = { createdAt: Date; updatedAt: Date };
