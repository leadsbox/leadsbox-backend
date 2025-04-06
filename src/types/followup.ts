export interface IFollowUp {
  conversationId: string;
  followUpTime: Date;
  status: string; 
  notes?: string;
}

export type DefaultDate = { createdAt: Date; updatedAt: Date };