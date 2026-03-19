const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// Rotas públicas
router.get('/', groupController.getAllGroups);
router.post('/', groupController.createGroup);
router.post('/:id/visit', groupController.incrementVisits);
router.post('/vip/activate-code', groupController.activateVipWithCode);

// Rotas admin
router.get('/pending', groupController.getPendingGroups);
router.post('/admin/verify', groupController.verifyAdminPassword);
router.post('/:id/approve', groupController.approveGroup);
router.delete('/:id/reject', groupController.rejectGroup);
router.delete('/:id', groupController.deleteGroup);
router.post('/admin/coupons/generate', groupController.generateCoupons);

module.exports = router;
