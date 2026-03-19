const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Criar preferência de pagamento
router.post('/create-preference', paymentController.createPaymentPreference);

// Webhook do Mercado Pago
router.post('/webhook', paymentController.paymentWebhook);

// Ativar VIP manualmente
router.post('/activate-vip', paymentController.activateVip);

// Histórico de pagamentos (Admin)
router.get('/history', paymentController.getPaymentHistory);

module.exports = router;
