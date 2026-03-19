const express = require('express');
const router = express.Router();
const couponOrderController = require('../controllers/couponOrderController');
const emailController = require('../controllers/emailController');
const configController = require('../controllers/configController');

// Criar pedido de cupom
router.post('/create-order', couponOrderController.createCouponOrder);

// Confirmar pagamento e enviar cupom (Admin)
router.post('/confirm-payment', couponOrderController.confirmCouponPayment);

// Listar pedidos (Admin)
router.get('/orders', couponOrderController.listCouponOrders);

// Reenviar cupom por email (Admin)
router.post('/resend-email', couponOrderController.resendCouponEmail);

// Testar configuração de email
router.get('/test-email', emailController.testEmail);

// Salvar senha de email (Admin)
router.post('/save-email-password', configController.saveEmailPassword);

// Verificar configuração de email
router.get('/check-email-config', configController.checkEmailConfig);

module.exports = router;
