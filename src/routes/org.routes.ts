import { Router } from 'express';
import { OrgCtrl } from '../controllers/org.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Organization routes
router.post('/', OrgCtrl.createOrg);
router.get('/', OrgCtrl.listMyOrgs);
router.get('/:orgId', OrgCtrl.getOrg);
router.put('/:orgId', OrgCtrl.updateOrg);

// Bank account routes for the organization
router.post('/:orgId/bank-accounts', OrgCtrl.addBankAccount);
router.put('/:orgId/bank-accounts/:accountId', OrgCtrl.updateBankAccount);
router.delete('/:orgId/bank-accounts/:accountId', OrgCtrl.deleteBankAccount);

export default router;
