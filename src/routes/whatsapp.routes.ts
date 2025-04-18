import { Router } from "express";
import { WhatsappCtrl } from "../controllers/whatsapp.controller";

const router = Router();

router.get("/webhook", WhatsappCtrl.verifyWebhook.bind(WhatsappCtrl));
router.post("/webhook", WhatsappCtrl.handleUpdate.bind(WhatsappCtrl));

export default router;
