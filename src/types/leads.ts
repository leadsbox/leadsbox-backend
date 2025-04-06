export interface ITransaction {
  tag: string;
  notes: string;
  createdAt?: Date;
}

export interface ILead {
  conversationId: string;
  userId: string;
  transactions: ITransaction[];
}

export type DefaultDate = { createdAt: Date; updatedAt: Date };
