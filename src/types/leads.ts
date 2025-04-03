// types/lead.ts
export interface ILead {
  conversationId: string;
  tag: string;
  notes?: string;
  userId: string; // Reference to the User _id
}

export type DefaultDate = { createdAt: Date; updatedAt: Date };