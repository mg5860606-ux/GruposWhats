const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Listar planos VIP disponíveis
router.get('/plans', paymentController.listPlans);

// CHECKOUT TRANSPARENTE (novo)
router.post('/create-pix', paymentController.createPixPayment);
router.post('/create-card', paymentController.createCardPayment);
router.get('/status/:paymentId', paymentController.checkPaymentStatus);

// CHECKOUT PRO (antigo - manter por compatibilidade)
router.post('/create-preference', paymentController.createPaymentPreference);

// Webhook do Mercado Pago
router.post('/webhook', paymentController.paymentWebhook);

// Ativar VIP manualmente
router.post('/activate-vip', paymentController.activateVip);

// Histórico de pagamentos (Admin)
router.get('/history', paymentController.getPaymentHistory);

module.exports = router;
