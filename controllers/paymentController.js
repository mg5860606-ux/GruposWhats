const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { db } = require('../config/firebase');

// Configurar Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});
const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

// Tabela de preços dos planos (BACKEND - fonte de verdade)
const PLANOS_VIP = {
  12: { horas: 12, preco: 9.90, nome: '12 Horas', descricao: 'Padrão' },
  24: { horas: 24, preco: 19.80, nome: '24 Horas', descricao: 'Dobro' },
  72: { horas: 72, preco: 59.40, nome: '3 Dias', descricao: 'Fim de Semana' },
  168: { horas: 168, preco: 138.60, nome: '7 Dias', descricao: 'Semana Completa' }
};

/**
 * Listar planos VIP disponíveis
 */
exports.listPlans = async (req, res) => {
  try {
    const planos = Object.values(PLANOS_VIP).map(plano => ({
      horas: plano.horas,
      nome: plano.nome,
      preco: plano.preco,
      descricao: plano.descricao || `Destaque VIP por ${plano.horas} horas`
    }));

    res.json({ 
      success: true, 
      planos 
    });
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao listar planos' 
    });
  }
};

/**
 * Criar pagamento PIX (Checkout Transparente)
 * Gera QR Code para pagamento no próprio site
 */
exports.createPixPayment = async (req, res) => {
  try {
    const { 
      groupId, 
      planoHoras,
      nome, 
      cpf, 
      email,
      codigoCupom
    } = req.body;

    // Validação
    if (!groupId || !planoHoras || !nome || !cpf || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados incompletos' 
      });
    }

    // Buscar plano e calcular preço
    const plano = PLANOS_VIP[parseInt(planoHoras)];
    if (!plano) {
      return res.status(400).json({ 
        success: false, 
        error: 'Plano inválido' 
      });
    }

    // Buscar grupo
    const groupDoc = await db.collection('grupos').doc(groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Grupo não encontrado' 
      });
    }

    const grupoData = groupDoc.data();
    let precoOriginal = plano.preco;
    let precoFinal = precoOriginal;
    let cupomData = null;
    let cupomId = null;

    // Validar cupom
    if (codigoCupom) {
      const cupomSnapshot = await db.collection('cupons')
        .where('codigo', '==', codigoCupom.toUpperCase().trim())
        .where('ativo', '==', true)
        .limit(1)
        .get();
      
      if (!cupomSnapshot.empty) {
        const cupomDoc = cupomSnapshot.docs[0];
        const cupom = cupomDoc.data();
        
        const cupomValido = (!cupom.dataValidade || cupom.dataValidade > Date.now()) &&
                           (!cupom.limite || cupom.usos < cupom.limite);
        
        if (cupomValido) {
          cupomId = cupomDoc.id;
          
          if (cupom.tipo === 'percentual') {
            const desconto = (precoOriginal * cupom.desconto) / 100;
            precoFinal = precoOriginal - desconto;
          } else if (cupom.tipo === 'valor') {
            precoFinal = precoOriginal - cupom.desconto;
          }
          
          precoFinal = Math.max(precoFinal, 0.50);
          
          cupomData = {
            id: cupomId,
            codigo: cupom.codigo,
            desconto: cupom.desconto,
            tipo: cupom.tipo,
            descontoAplicado: precoOriginal - precoFinal
          };
          
          console.log(`✅ Cupom ${cupom.codigo} aplicado no PIX`);
        }
      }
    }

    // Criar pagamento PIX via Payment API
    const paymentData = {
      transaction_amount: parseFloat(precoFinal.toFixed(2)),
      description: `${plano.nome} - ${grupoData.nome}`,
      payment_method_id: 'pix',
      payer: {
        email: email,
        first_name: nome.split(' ')[0],
        last_name: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, '')
        }
      },
      notification_url: `${process.env.BASE_URL}/api/payment/webhook`,
      external_reference: groupId
    };

    const payment = await paymentClient.create({ body: paymentData });

    // Salvar pagamento pendente
    await db.collection('pagamentosPendentes').add({
      grupoId: groupId,
      grupoNome: grupoData.nome,
      paymentId: payment.id,
      nome,
      cpf,
      email,
      plano: plano.nome,
      planoHoras: plano.horas,
      valorOriginal: precoOriginal,
      valorFinal: precoFinal,
      cupom: cupomData,
      cupomId: cupomId,
      hours: plano.horas,
      metodoPagamento: 'pix',
      status: 'pending',
      dataCriacao: Date.now(),
      pixData: {
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url
      }
    });

    console.log(`💰 PIX gerado: Grupo ${groupId} - ${plano.nome} - R$ ${precoFinal.toFixed(2)}`);

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
      valorOriginal: precoOriginal,
      valorFinal: precoFinal,
      cupomAplicado: cupomData !== null,
      economia: cupomData ? cupomData.descontoAplicado : 0
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao gerar PIX' 
    });
  }
};

/**
 * Criar pagamento com Cartão (Checkout Transparente)
 * Processa cartão no próprio site
 */
exports.createCardPayment = async (req, res) => {
  try {
    const {
      groupId,
      planoHoras,
      nome,
      cpf,
      email,
      token,  // Token do cartão (gerado no frontend via MP.js)
      codigoCupom,
      installments,  // Parcelas
      issuerId  // Emissor do cartão
    } = req.body;

    // Validação
    if (!groupId || !planoHoras || !nome || !cpf || !email || !token) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos'
      });
    }

    // Buscar plano e calcular preço
    const plano = PLANOS_VIP[parseInt(planoHoras)];
    if (!plano) {
      return res.status(400).json({
        success: false,
        error: 'Plano inválido'
      });
    }

    // Buscar grupo
    const groupDoc = await db.collection('grupos').doc(groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Grupo não encontrado'
      });
    }

    const grupoData = groupDoc.data();
    let precoOriginal = plano.preco;
    let precoFinal = precoOriginal;
    let cupomData = null;
    let cupomId = null;

    // Validar cupom
    if (codigoCupom) {
      const cupomSnapshot = await db.collection('cupons')
        .where('codigo', '==', codigoCupom.toUpperCase().trim())
        .where('ativo', '==', true)
        .limit(1)
        .get();

      if (!cupomSnapshot.empty) {
        const cupomDoc = cupomSnapshot.docs[0];
        const cupom = cupomDoc.data();

        const cupomValido = (!cupom.dataValidade || cupom.dataValidade > Date.now()) &&
          (!cupom.limite || cupom.usos < cupom.limite);

        if (cupomValido) {
          cupomId = cupomDoc.id;

          if (cupom.tipo === 'percentual') {
            const desconto = (precoOriginal * cupom.desconto) / 100;
            precoFinal = precoOriginal - desconto;
          } else if (cupom.tipo === 'valor') {
            precoFinal = precoOriginal - cupom.desconto;
          }

          precoFinal = Math.max(precoFinal, 0.50);

          cupomData = {
            id: cupomId,
            codigo: cupom.codigo,
            desconto: cupom.desconto,
            tipo: cupom.tipo,
            descontoAplicado: precoOriginal - precoFinal
          };

          console.log(`✅ Cupom ${cupom.codigo} aplicado no Cartão`);
        }
      }
    }

    // Criar pagamento com cartão via Payment API
    const paymentData = {
      transaction_amount: parseFloat(precoFinal.toFixed(2)),
      token: token,
      description: `${plano.nome} - ${grupoData.nome}`,
      installments: parseInt(installments) || 1,
      payment_method_id: 'visa',  // Será detectado automaticamente pelo token
      issuer_id: issuerId || undefined,
      payer: {
        email: email,
        first_name: nome.split(' ')[0],
        last_name: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, '')
        }
      },
      notification_url: `${process.env.BASE_URL}/api/payment/webhook`,
      external_reference: groupId,
      statement_descriptor: 'GRUPOSWHATS VIP'
    };

    const payment = await paymentClient.create({ body: paymentData });

    // Salvar pagamento pendente
    await db.collection('pagamentosPendentes').add({
      grupoId: groupId,
      grupoNome: grupoData.nome,
      paymentId: payment.id,
      nome,
      cpf,
      email,
      plano: plano.nome,
      planoHoras: plano.horas,
      valorOriginal: precoOriginal,
      valorFinal: precoFinal,
      cupom: cupomData,
      cupomId: cupomId,
      hours: plano.horas,
      metodoPagamento: 'credit_card',
      parcelas: installments || 1,
      status: payment.status,
      dataCriacao: Date.now()
    });

    console.log(`💳 Cartão processado: Grupo ${groupId} - ${plano.nome} - Status: ${payment.status}`);

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      valorOriginal: precoOriginal,
      valorFinal: precoFinal,
      cupomAplicado: cupomData !== null,
      economia: cupomData ? cupomData.descontoAplicado : 0
    });

  } catch (error) {
    console.error('❌ Erro ao processar cartão:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar pagamento'
    });
  }
};

/**
 * Verificar status de pagamento
 * Usado para polling do status do PIX
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await paymentClient.get({ id: paymentId });

    res.json({
      success: true,
      status: payment.status,
      statusDetail: payment.status_detail
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status'
    });
  }
};

// Criar preferência de pagamento
exports.createPaymentPreference = async (req, res) => {
  try {
    const { 
      groupId, 
      planoHoras,  // ← Agora recebe apenas as horas do plano
      nome, 
      cpf, 
      email, 
      telefone, 
      metodoPagamento,
      codigoCupom  // ← Código do cupom (opcional)
    } = req.body;

    // Validação de dados obrigatórios
    if (!groupId || !planoHoras || !nome || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados incompletos' 
      });
    }

    // ❗ REGRA 1: PREÇO VEM DO BACKEND (não do frontend)
    const plano = PLANOS_VIP[parseInt(planoHoras)];
    
    if (!plano) {
      return res.status(400).json({ 
        success: false, 
        error: 'Plano inválido. Escolha entre 12h, 24h ou 48h' 
      });
    }

    // Buscar informações do grupo
    const groupDoc = await db.collection('grupos').doc(groupId).get();
    
    if (!groupDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Grupo não encontrado' 
      });
    }

    const grupoData = groupDoc.data();
    
    // Preço base do plano
    let precoOriginal = plano.preco;
    let precoFinal = precoOriginal;
    let cupomData = null;
    let cupomId = null;

    // ❗ REGRA 2: VALIDAR CUPOM NO BACKEND (não confiar no frontend)
    if (codigoCupom) {
      const cupomSnapshot = await db.collection('cupons')
        .where('codigo', '==', codigoCupom.toUpperCase().trim())
        .where('ativo', '==', true)
        .limit(1)
        .get();
      
      if (!cupomSnapshot.empty) {
        const cupomDoc = cupomSnapshot.docs[0];
        const cupom = cupomDoc.data();
        
        // Validar validade
        const cupomValido = (!cupom.dataValidade || cupom.dataValidade > Date.now()) &&
                           (!cupom.limite || cupom.usos < cupom.limite);
        
        if (cupomValido) {
          cupomId = cupomDoc.id;
          
          // Calcular desconto
          if (cupom.tipo === 'percentual') {
            const desconto = (precoOriginal * cupom.desconto) / 100;
            precoFinal = precoOriginal - desconto;
          } else if (cupom.tipo === 'valor') {
            precoFinal = precoOriginal - cupom.desconto;
          }
          
          // Garantir preço mínimo
          precoFinal = Math.max(precoFinal, 0.50);
          
          // Salvar dados do cupom para referência
          cupomData = {
            id: cupomId,
            codigo: cupom.codigo,
            desconto: cupom.desconto,
            tipo: cupom.tipo,
            descontoAplicado: precoOriginal - precoFinal
          };
          
          console.log(`✅ Cupom ${cupom.codigo} aplicado: R$ ${precoOriginal.toFixed(2)} → R$ ${precoFinal.toFixed(2)}`);
        } else {
          console.log(`⚠️ Cupom ${codigoCupom} inválido ou expirado`);
        }
      }
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // Criar preferência de pagamento no Mercado Pago
    const preference = {
      items: [
        {
          title: `${plano.nome} - ${grupoData.nome}`,
          description: `Destaque VIP por ${plano.horas} horas`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(precoFinal.toFixed(2))  // ← Preço calculado no backend
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
    const pagamentoPendente = {
      grupoId: groupId,
      grupoNome: grupoData.nome,
      preferenceId: response.id,
      nome,
      cpf,
      email,
      telefone,
      plano: plano.nome,
      planoHoras: plano.horas,
      valorOriginal: precoOriginal,
      valorFinal: precoFinal,
      cupom: cupomData,  // ← Salva info do cupom (se aplicado)
      cupomId: cupomId,  // ← ID para incrementar uso depois
      hours: plano.horas,
      metodoPagamento: metodoPagamento || 'Não especificado',
      status: 'pending',
      dataCriacao: Date.now()
    };

    await db.collection('pagamentosPendentes').add(pagamentoPendente);

    console.log(`💰 Pagamento criado: Grupo ${groupId} - ${plano.nome} - R$ ${precoFinal.toFixed(2)}`);

    res.json({ 
      success: true, 
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      valorOriginal: precoOriginal,
      valorFinal: precoFinal,
      cupomAplicado: cupomData !== null,
      economia: cupomData ? cupomData.descontoAplicado : 0
    });
  } catch (error) {
    console.error('❌ Erro ao criar preferência de pagamento:', error);
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

    console.log('🔔 Webhook recebido:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;
      
      // Buscar informações do pagamento
      const payment = await paymentClient.get({ id: paymentId });

      console.log('📊 Status do pagamento:', payment.status);

      // ❗ REGRA 4: WEBHOOK É A FONTE DE VERDADE
      if (payment.status === 'approved') {
        const groupId = payment.external_reference;
        
        // Buscar pagamento pendente
        const pendingSnapshot = await db.collection('pagamentosPendentes')
          .where('grupoId', '==', groupId)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!pendingSnapshot.empty) {
          const pendingDoc = pendingSnapshot.docs[0];
          const pendingData = pendingDoc.data();
          const hours = pendingData.hours || 12;
          const cupomId = pendingData.cupomId;

          // Ativar VIP no grupo
          await db.collection('grupos').doc(groupId).update({
            vip: true,
            vipExpira: Date.now() + (hours * 60 * 60 * 1000),
            vipAtivadoEm: Date.now()
          });

          console.log(`✅ VIP ativado para grupo ${groupId} por ${hours} horas`);

          // ❗ REGRA 3: INCREMENTAR USO DO CUPOM APENAS AQUI (webhook)
          if (cupomId) {
            try {
              const cupomRef = db.collection('cupons').doc(cupomId);
              const cupomDoc = await cupomRef.get();
              
              if (cupomDoc.exists) {
                const cupomAtual = cupomDoc.data();
                await cupomRef.update({
                  usos: (cupomAtual.usos || 0) + 1,
                  ultimoUso: Date.now()
                });
                
                console.log(`🎫 Cupom ${cupomAtual.codigo} usado (total: ${cupomAtual.usos + 1})`);
              }
            } catch (cupomError) {
              console.error('⚠️ Erro ao incrementar cupom (pagamento foi processado):', cupomError);
              // Não bloqueia o fluxo - pagamento já foi aprovado
            }
          }

          // Mover para histórico de pagamentos aprovados
          await db.collection('pagamentosHistorico').add({
            ...pendingData,
            status: 'approved',
            paymentId: paymentId,
            dataAprovacao: Date.now(),
            paymentStatus: payment.status,
            paymentStatusDetail: payment.status_detail
          });

          // Remover de pendentes
          await db.collection('pagamentosPendentes').doc(pendingDoc.id).delete();

          console.log(`💚 Pagamento processado com sucesso: ${paymentId}`);
        } else {
          console.log(`⚠️ Pagamento pendente não encontrado para grupo: ${groupId}`);
        }
      } else if (payment.status === 'rejected') {
        console.log(`❌ Pagamento rejeitado: ${paymentId}`);
        
        // Opcional: marcar pagamento pendente como rejeitado
        const groupId = payment.external_reference;
        const pendingSnapshot = await db.collection('pagamentosPendentes')
          .where('grupoId', '==', groupId)
          .where('status', '==', 'pending')
          .limit(1)
          .get();
        
        if (!pendingSnapshot.empty) {
          const pendingDoc = pendingSnapshot.docs[0];
          await db.collection('pagamentosHistorico').add({
            ...pendingDoc.data(),
            status: 'rejected',
            paymentId: paymentId,
            dataRejeicao: Date.now(),
            motivoRejeicao: payment.status_detail
          });
          await pendingDoc.ref.delete();
        }
      } else {
        console.log(`ℹ️ Pagamento em outro status: ${payment.status}`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
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
