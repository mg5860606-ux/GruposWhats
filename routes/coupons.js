const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// Validar cupom (público)
router.post('/validate', couponController.validateCoupon);

// Listar cupons (admin)
router.get('/list', couponController.listCoupons);

// Criar cupom (admin)
router.post('/create', couponController.createCoupon);

// Desativar cupom (admin)
router.patch('/:cupomId/deactivate', couponController.deactivateCoupon);

// Estatísticas de cupons (admin)
router.get('/stats', couponController.getCouponStats);

module.exports = router;
