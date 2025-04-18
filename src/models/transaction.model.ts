import { Schema } from "mongoose";

export const TransactionSchema = new Schema({
  tag: { type: String, required: true, default: "New" },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
