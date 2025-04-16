import { LeadModel } from "../models/leads.model";

export class LeadService {
  /**
   * Updates or assigns a tag to a conversation (lead) identified by conversationId.
   * @param conversationId - The unique identifier for the conversation.
   * @param tag - The tag to assign (e.g., "New", "Interested", "Follow-Up").
   */
  public static async updateConversationTag(conversationId: string, tag: string): Promise<any> {
    try {
      // Find the lead record by conversationId and update the tag.
      const updatedLead = await LeadModel.findOneAndUpdate({ conversationId }, { tag }, { new: true });
      return updatedLead;
    } catch (error) {
      console.error('Error in updateConversationTag:', error);
      throw error;
    }
  }

  /**
   * Retrieves all leads (conversation records) from the database.
   */
  public static async getLeads(): Promise<any[]> {
    try {
      const leads = await LeadModel.find({});
      return leads;
    } catch (error) {
      console.error('Error in getLeads:', error);
      throw error;
    }
  }

  public static async storeTelegramLead(chatId: number | string, userId: string, message: string, tag: string): Promise<any> {
    try {
      const newTransaction = {
        tag,
        notes: message,
        createdAt: new Date(),
      };

      let lead = await LeadModel.findOne({ conversationId: chatId });
      if (!lead) {
        lead = await LeadModel.create({
          conversationId: chatId,
          userId: userId,
          transactions: [newTransaction],
        });
      } else {
        lead.transactions.push(newTransaction);
        await lead.save();
      }
      return lead;
    } catch (error) {
      console.error('Error storing Telegram lead:', error);
      throw error;
    }
  }

  public static async getAllLeads(): Promise<any> {
    try {
      const leads = await LeadModel.find({}).sort({ createdAt: -1 }).lean();
      return leads;
    } catch (error) {
      console.error("Error fetching leads:", error);
      throw error;
    }
  }

  public static async getLeadsByUserId(userId: string): Promise<any[]> {
    try {
      const leads = await LeadModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return leads;
    } catch (error) {
      console.error('Error fetching leads for user:', error);
      throw error;
    }
  }
}
