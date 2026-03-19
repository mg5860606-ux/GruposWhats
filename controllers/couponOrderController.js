const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const emailController = require('./emailController');

/**
 * Criar pedido de cupom
 */
exports.createCouponOrder = async (req, res) => {
    try {
        const { tipo, quantidade, preco, nome, email, telefone } = req.body;

        if (!tipo || !quantidade || !preco || !nome || !email) {
            return res.status(400).json({
                success: false,
                error: 'Dados incompletos'
            });
        }

        // Gerar código de cupom único
        const codigoCupom = `${tipo.toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`;

        // Salvar pedido
        const pedido = {
            tipo,
            quantidade,
            preco: parseFloat(preco),
            nome,
            email,
            telefone: telefone || '',
            codigoCupom,
            status: 'pending',
            dataCriacao: Date.now()
        };

        const docRef = await db.collection('pedidosCupons').add(pedido);

        res.json({
            success: true,
            message: 'Pedido criado! Aguardando confirmação de pagamento.',
            orderId: docRef.id,
            codigoCupom
        });

    } catch (error) {
        console.error('❌ Erro ao criar pedido de cupom:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar pedido'
        });
    }
};

/**
 * Confirmar pagamento e enviar cupom por email (Admin)
 */
exports.confirmCouponPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'ID do pedido não fornecido'
            });
        }

        // Buscar pedido
        const pedidoDoc = await db.collection('pedidosCupons').doc(orderId).get();

        if (!pedidoDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Pedido não encontrado'
            });
        }

        const pedidoData = pedidoDoc.data();

        // Criar cupom no sistema
        const cupomData = {
            codigo: pedidoData.codigoCupom,
            desconto: 100, // 100% de desconto = grátis
            tipo: 'percentual',
            usos: 0,
            limite: parseInt(pedidoData.quantidade),
            ativo: true,
            dataValidade: null, // Sem expiração
            dataCriacao: Date.now(),
            pedidoId: orderId
        };

        await db.collection('cupons').add(cupomData);

        // Atualizar status do pedido
        await db.collection('pedidosCupons').doc(orderId).update({
            status: 'confirmed',
            dataConfirmacao: Date.now()
        });

        // Enviar cupom por email
        const emailResult = await emailController.sendCouponEmail(
            {
                nome: pedidoData.nome,
                email: pedidoData.email
            },
            {
                tipo: pedidoData.tipo,
                quantidade: pedidoData.quantidade,
                codigo: pedidoData.codigoCupom
            }
        );

        if (emailResult.success) {
            res.json({
                success: true,
                message: 'Cupom confirmado e enviado por email!',
                codigo: pedidoData.codigoCupom
            });
        } else {
            res.json({
                success: true,
                message: 'Cupom confirmado, mas email falhou. Código: ' + pedidoData.codigoCupom,
                emailError: emailResult.error
            });
        }

    } catch (error) {
        console.error('❌ Erro ao confirmar cupom:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao confirmar cupom'
        });
    }
};

/**
 * Listar pedidos de cupons (Admin)
 */
exports.listCouponOrders = async (req, res) => {
    try {
        const snapshot = await db.collection('pedidosCupons')
            .orderBy('dataCriacao', 'desc')
            .limit(100)
            .get();

        const pedidos = [];
        snapshot.forEach(doc => {
            pedidos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            pedidos
        });

    } catch (error) {
        console.error('❌ Erro ao listar pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar pedidos'
        });
    }
};

/**
 * Reenviar cupom por email (Admin)
 */
exports.resendCouponEmail = async (req, res) => {
    try {
        const { orderId } = req.body;

        const pedidoDoc = await db.collection('pedidosCupons').doc(orderId).get();

        if (!pedidoDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Pedido não encontrado'
            });
        }

        const pedidoData = pedidoDoc.data();

        const emailResult = await emailController.sendCouponEmail(
            {
                nome: pedidoData.nome,
                email: pedidoData.email
            },
            {
                tipo: pedidoData.tipo,
                quantidade: pedidoData.quantidade,
                codigo: pedidoData.codigoCupom
            }
        );

        if (emailResult.success) {
            res.json({
                success: true,
                message: 'Cupom reenviado por email!'
            });
        } else {
            res.status(500).json({
                success: false,
                error: emailResult.error
            });
        }

    } catch (error) {
        console.error('❌ Erro ao reenviar cupom:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao reenviar cupom'
        });
    }
};
