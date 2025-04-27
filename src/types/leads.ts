import { UserProvider } from "./user";

export interface TransactionType {
  tag: string;
  notes: string;
  createdAt?: Date;
}

export interface LeadType {
  conversationId: string;
  userId: string;
  transactions: TransactionType[];
  provider: UserProvider
  providerId: string;
}

export type DefaultDate = { createdAt: Date; updatedAt: Date };

export enum LeadLabel {
  CLOSED_LOST_TRANSACTION = 'Closed/ Lost Transaction',
  TRANSACTION_SUCCESSFUL = 'Transaction Successful',
  PAYMENT_PENDING = 'Payment Pending',
  TRANSACTION_IN_PROGRESS = 'Transaction in Progress',
  FOLLOW_UP_REQUIRED = 'Follow-Up Required',
  NEW_INQUIRY = 'New Inquiry',
  DEMO_REQUEST = 'Demo Request',
  TECHNICAL_SUPPORT = 'Technical Support',
  PRICING_INQUIRY = 'Pricing Inquiry',
  PARTNERSHIP_OPPORTUNITY = 'Partnership Opportunity',
  FEEDBACK = 'Feedback',
  ENGAGED = 'Engaged',
  NOT_A_LEAD = 'Not a Lead',
}
