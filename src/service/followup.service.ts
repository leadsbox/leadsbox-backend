import { FollowUpModel } from "../models/followup.model";

export class FollowUpService {
  /**
   * Schedules a follow-up for a given Telegram conversation.
   * @param chatId
   * @param followUpTime
   */
  public static async scheduleTelegramFollowUp(
    chatId: number | string,
    followUpTime: string,
  ): Promise<any> {
    try {
      const followUp = await FollowUpModel.create({
        conversationId: chatId,
        followUpTime: new Date(followUpTime),
        status: "scheduled",
      });
      return followUp;
    } catch (error) {
      console.error("Error scheduling Telegram follow-up:", error);
      throw error;
    }
  }
}
