import { Request, Response } from "express";
import { ResponseUtils } from "../utils/reponse";
import { StatusCode } from "../types/response";
import { LeadService } from "../service/leads.service";
import { LeadModel } from "../models/leads.model";

class LeadController {
  /**
   * Update or assign a tag to a conversation (lead).
   */
  public async updateTag(req: Request, res: Response): Promise<void> {
    const { conversationId } = req.params;
    const { tag } = req.body;
    if (!tag) {
      return ResponseUtils.error(
        res,
        "Tag is required",
        StatusCode.BAD_REQUEST,
      );
    }
    try {
      const updatedLead = await LeadService.updateConversationTag(
        conversationId,
        tag,
      );
      return ResponseUtils.success(
        res,
        { updatedLead },
        "Lead tag updated successfully",
        StatusCode.OK,
      );
    } catch (error: any) {
      console.error("Error updating lead tag:", error);
      return ResponseUtils.error(
        res,
        "Failed to update lead tag",
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error,
      );
    }
  }

  public async tagConversation(message: string): Promise<string | undefined> {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("cancel") ||
      lowerMessage.includes("not interested") ||
      lowerMessage.includes("lost")
    ) {
      return "Closed Lost";
    }

    if (
      lowerMessage.includes("paid") ||
      lowerMessage.includes("completed") ||
      lowerMessage.includes("successful") ||
      lowerMessage.includes("received")
    ) {
      return "Transaction Successful";
    }

    if (
      lowerMessage.includes("payment") ||
      lowerMessage.includes("transfer") ||
      lowerMessage.includes("awaiting payment")
    ) {
      return "Payment Pending";
    }

    if (
      lowerMessage.includes("order") ||
      lowerMessage.includes("purchase") ||
      lowerMessage.includes("confirm")
    ) {
      return "Transaction in Progress";
    }

    if (
      lowerMessage.includes("follow-up") ||
      lowerMessage.includes("reminder") ||
      lowerMessage.includes("call me") ||
      lowerMessage.includes("schedule")
    ) {
      return "Follow-Up Required";
    }

    if (
      lowerMessage.includes("inquiry") ||
      lowerMessage.includes("question") ||
      lowerMessage.includes("info")
    ) {
      return "New Inquiry";
    }

    return "Engaged";
  }

  /**
   * Retrieve a list of leads.
   */
  public async listLeads(req: Request, res: Response): Promise<void> {
    try {
      const leads = await LeadService.getLeads();
      return ResponseUtils.success(
        res,
        { leads },
        "Leads retrieved successfully",
        StatusCode.OK,
      );
    } catch (error: any) {
      console.error("Error retrieving leads:", error);
      return ResponseUtils.error(
        res,
        "Failed to retrieve leads",
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error,
      );
    }
  }
}

export const LeadCtrl = new LeadController();
