import { LeadModel } from "../models/leads.model";

export class LeadService {
  /**
   * Updates or assigns a tag to a conversation (lead) identified by conversationId.
   */
  public static async updateConversationTag(
    conversationId: string,
    tag: string,
  ): Promise<any> {
    try {
      const updatedLead = await LeadModel.findOneAndUpdate(
        { conversationId },
        { tag },
        { new: true },
      );
      return updatedLead;
    } catch (error) {
      console.error("Error in updateConversationTag:", error);
      throw error;
    }
  }

  /**
   * Alias for updateConversationTag so your controller can call updateLeadTag.
   */
  public static async updateLeadTag(
    conversationId: string,
    tag: string,
  ): Promise<any> {
    return this.updateConversationTag(conversationId, tag);
  }

  /**
   * Retrieves all leads (conversation records) from the database.
   */
  public static async getLeads(): Promise<any[]> {
    try {
      return await LeadModel.find({});
    } catch (error) {
      console.error("Error in getLeads:", error);
      throw error;
    }
  }

  public static async getAllLeads(): Promise<any> {
    try {
      return await LeadModel.find({}).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error("Error fetching leads:", error);
      throw error;
    }
  }

  public static async getLeadsByUserId(userId: string): Promise<any[]> {
    try {
      return await LeadModel.find({ userId }).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error("Error fetching leads for user:", error);
      throw error;
    }
  }

  /**
   * Stores an incoming WhatsApp lead as a new transaction in the same way
   * you do for Telegram. Accepts an object so you can pass named params.
   */
  public static async storeWhatsAppLead(params: {
    conversationId: string;
    userId: string;
    message: string;
    tag: string;
  }): Promise<any> {
    const { conversationId, userId, message, tag } = params;
    const newTransaction = {
      tag,
      notes: message,
      createdAt: new Date(),
    };

    try {
      let lead = await LeadModel.findOne({ conversationId });
      if (!lead) {
        lead = await LeadModel.create({
          conversationId,
          userId,
          transactions: [newTransaction],
        });
      } else {
        lead.transactions.push(newTransaction);
        await lead.save();
      }
      return lead;
    } catch (error) {
      console.error("Error storing WhatsApp lead:", error);
      throw error;
    }
  }

  /**
   * (Unchanged) Stores a Telegram lead.
   */
  public static async storeTelegramLead(
    chatId: number | string,
    userId: string,
    message: string,
    tag: string,
  ): Promise<any> {
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
      console.error("Error storing Telegram lead:", error);
      throw error;
    }
  }
}
