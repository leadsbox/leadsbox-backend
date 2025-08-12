import { Router } from 'express';
import { InvoiceCtrl } from '../controllers/invoices.controller';

const router = Router();

router.post('/', InvoiceCtrl.createInvoice.bind(InvoiceCtrl));
router.post('/:code/confirm-payment', InvoiceCtrl.confirmPayment.bind(InvoiceCtrl));
router.post('/:code/verify-payment', InvoiceCtrl.verifyPayment.bind(InvoiceCtrl));
router.get('/:code', InvoiceCtrl.getInvoice.bind(InvoiceCtrl));
router.post('/:code/claim', InvoiceCtrl.createClaim.bind(InvoiceCtrl));
router.get('/verify/queue/list', InvoiceCtrl.getVerifyQueue.bind(InvoiceCtrl));
router.post('/claims/:id/approve', InvoiceCtrl.approveClaim.bind(InvoiceCtrl));
router.post('/claims/:id/reject', InvoiceCtrl.rejectClaim.bind(InvoiceCtrl));

export default router;
