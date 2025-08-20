import { LeadModel } from '../models/leads.model';

export class LeadService {
  /**
   * Updates or assigns a tag to a conversation (lead) identified by conversationId.
   */
  public static async updateConversationTag(
    conversationId: string,
    tag: string
  ): Promise<any> {
    try {
      const updatedLead = await LeadModel.findOneAndUpdate(
        { conversationId },
        { tag },
        { new: true }
      );
      return updatedLead;
    } catch (error) {
      console.error('Error in updateConversationTag:', error);
      throw error;
    }
  }

  /**
   * Alias for updateConversationTag so your controller can call updateLeadTag.
   */
  public static async updateLeadTag(
    conversationId: string,
    tag: string
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
      console.error('Error in getLeads:', error);
      throw error;
    }
  }

  public static async getAllLeads(): Promise<any> {
    try {
      return await LeadModel.find({}).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  public static async getLeadsByUserId(userId: string): Promise<any[]> {
    try {
      return await LeadModel.find({ userId }).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error('Error fetching leads for user:', error);
      throw error;
    }
  }
}
