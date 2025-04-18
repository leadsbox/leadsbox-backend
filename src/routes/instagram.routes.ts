import { Router } from "express";
import { InstagramCtrl } from "../controllers/instagram.controller";

const router = Router();

router.get(
  "/conversations",
  InstagramCtrl.getConversations.bind(InstagramCtrl),
);
router.post("/reply", InstagramCtrl.postReply.bind(InstagramCtrl));

export default router;
