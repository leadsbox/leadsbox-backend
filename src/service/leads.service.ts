// services/leadService.ts

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

  public static async storeTelegramLead(chatId: number | string, userId: string, message: string): Promise<any> {
    try {
      let lead = await LeadModel.findOne({ conversationId: chatId });
      if (!lead) {
        // Create a new lead if none exists
        lead = await LeadModel.create({
          conversationId: chatId,
          userId: userId, // now storing the required userId
          tag: "New",
          notes: message,
          // Optionally add a field like 'source: "telegram"'
        });
      } else {
        // Append to the lead's notes
        lead.notes = lead.notes ? `${lead.notes}\n${message}` : message;
        await lead.save();
      }
      return lead;
    } catch (error) {
      console.error("Error storing Telegram lead:", error);
      throw error;
    }
  }
}
