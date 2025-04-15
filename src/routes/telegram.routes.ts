import { Router } from 'express';
import { TelegramCtrl } from '../controllers/telegram.controller';

const router = Router();

router.post('/webhook', TelegramCtrl.handleUpdate.bind(TelegramCtrl));

router.post('/reply', TelegramCtrl.sendReply.bind(TelegramCtrl));

router.get('/leads/user', TelegramCtrl.getLeadsByUserId.bind(TelegramCtrl));

export default router;
