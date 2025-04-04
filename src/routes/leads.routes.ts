import { Router } from 'express';
import { LeadCtrl } from '../controllers/leads.controller';

const router = Router();

router.put('/leads/:conversationId/tag', LeadCtrl.updateTag.bind(LeadCtrl));
router.get('/leads', LeadCtrl.listLeads.bind(LeadCtrl));


export default router;
