import { Router } from 'express';
import { SettingsCtrl } from '../controllers/settings.controller';

const router = Router();

router.get('/bank', SettingsCtrl.getBankDetails.bind(SettingsCtrl));
router.post('/bank', SettingsCtrl.updateBankDetails.bind(SettingsCtrl));

export default router;
