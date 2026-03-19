const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { db } = require('../config/firebase');

// Configurar Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});
const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

// Criar preferência de pagamento
exports.createPaymentPreference = async (req, res) => {
  try {
    const { groupId, hours, price, nome, cpf, email, telefone, metodoPagamento } = req.body;

    if (!groupId || !hours || !price || !nome || !email) {
      return res.status(400).json({ success: false, error: 'Dados incompletos' });
    }

    // Buscar informações do grupo
    const groupDoc = await db.collection('grupos').doc(groupId).get();
    
    if (!groupDoc.exists) {
      return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    }

    const grupoData = groupDoc.data();
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // Criar preferência de pagamento no Mercado Pago
    const preference = {
      items: [
        {
          title: `Impulsionamento VIP - ${grupoData.nome}`,
          description: `Destaque VIP por ${hours} horas`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(price)
        }
      ],
      payer: {
        name: nome,
        email: email,
        identification: {
          type: 'CPF',
          number: cpf ? cpf.replace(/\D/g, '') : ''
        },
        phone: {
          number: telefone ? telefone.replace(/\D/g, '') : ''
        }
      },
      back_urls: {
        success: `${baseUrl}/?vip=${groupId}&status=approved`,
        failure: `${baseUrl}/?status=failure`,
        pending: `${baseUrl}/?status=pending`
      },
      auto_return: 'approved',
      external_reference: groupId,
      notification_url: `${baseUrl}/api/payment/webhook`,
      statement_descriptor: 'GRUPOSWHATS VIP',
      payment_methods: {
        excluded_payment_types: metodoPagamento === 'pix' ? [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' }
        ] : metodoPagamento === 'card' ? [
          { id: 'pix' },
          { id: 'ticket' }
        ] : []
      }
    };

    const response = await preferenceClient.create({ body: preference });

    // Salvar histórico de pagamento pendente
    await db.collection('pagamentosPendentes').add({
      grupoId: groupId,
      grupoNome: grupoData.nome,
      preferenceId: response.id,
      nome,
      cpf,
      email,
      telefone,
      plano: `${hours} horas`,
      valor: parseFloat(price),
      hours: parseInt(hours),
      metodoPagamento: metodoPagamento || 'Não especificado',
      status: 'pending',
      dataCriacao: Date.now()
    });

    res.json({ 
      success: true, 
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point
    });
  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao processar pagamento' 
    });
  }
};

// Webhook do Mercado Pago
exports.paymentWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log('Webhook recebido:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;
      
      // Buscar informações do pagamento
      const payment = await paymentClient.get({ id: paymentId });

      console.log('Status do pagamento:', payment.status);

      if (payment.status === 'approved') {
        const groupId = payment.external_reference;
        
        // Buscar pagamento pendente
        const pendingSnapshot = await db.collection('pagamentosPendentes')
          .where('grupoId', '==', groupId)
          .limit(1)
          .get();

        if (!pendingSnapshot.empty) {
          const pendingDoc = pendingSnapshot.docs[0];
          const pendingData = pendingDoc.data();
          const hours = pendingData.hours || 12;

          // Ativar VIP no grupo
          await db.collection('grupos').doc(groupId).update({
            vip: true,
            vipExpira: Date.now() + (hours * 60 * 60 * 1000)
          });

          // Mover para histórico de pagamentos aprovados
          await db.collection('pagamentosHistorico').add({
            ...pendingData,
            status: 'approved',
            paymentId: paymentId,
            dataAprovacao: Date.now()
          });

          // Remover de pendentes
          await db.collection('pagamentosPendentes').doc(pendingDoc.id).delete();

          console.log(`VIP ativado para grupo ${groupId} por ${hours} horas`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Erro');
  }
};

// Ativar VIP manualmente (após redirecionamento)
exports.activateVip = async (req, res) => {
  try {
    const { groupId, hours } = req.body;

    if (!groupId || !hours) {
      return res.status(400).json({ success: false, error: 'Dados incompletos' });
    }

    await db.collection('grupos').doc(groupId).update({
      vip: true,
      vipExpira: Date.now() + (parseInt(hours) * 60 * 60 * 1000)
    });

    res.json({ 
      success: true, 
      message: `VIP ativado por ${hours} horas!` 
    });
  } catch (error) {
    console.error('Erro ao ativar VIP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Listar histórico de pagamentos (Admin)
exports.getPaymentHistory = async (req, res) => {
  try {
    const snapshot = await db.collection('pagamentosHistorico')
      .limit(100)
      .get();

    const pagamentos = [];
    snapshot.forEach(doc => {
      pagamentos.push({ id: doc.id, ...doc.data() });
    });

    // Ordenar por data no código
    pagamentos.sort((a, b) => (b.dataAprovacao || 0) - (a.dataAprovacao || 0));

    res.json({ success: true, pagamentos });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
