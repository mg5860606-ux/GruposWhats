const { db } = require('../config/firebase');

/**
 * Validar cupom
 * Retorna informações do cupom se válido
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { codigo } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código do cupom não fornecido' 
      });
    }

    // Buscar cupom no Firebase
    const snapshot = await db.collection('cupons')
      .where('codigo', '==', codigo.toUpperCase().trim())
      .where('ativo', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.json({ 
        success: false, 
        error: 'Cupom inválido ou inativo' 
      });
    }
    
    const cupomDoc = snapshot.docs[0];
    const cupom = cupomDoc.data();
    
    // Verificar validade (data de expiração)
    if (cupom.dataValidade && cupom.dataValidade < Date.now()) {
      return res.json({ 
        success: false, 
        error: 'Cupom expirado' 
      });
    }
    
    // Verificar limite de usos
    if (cupom.limite && cupom.usos >= cupom.limite) {
      return res.json({ 
        success: false, 
        error: 'Cupom esgotado (limite de usos atingido)' 
      });
    }
    
    // Retornar cupom válido
    res.json({ 
      success: true, 
      cupom: {
        id: cupomDoc.id,
        codigo: cupom.codigo,
        desconto: cupom.desconto,
        tipo: cupom.tipo,
        usosRestantes: cupom.limite ? (cupom.limite - cupom.usos) : 'ilimitado'
      }
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao validar cupom' 
    });
  }
};

/**
 * Listar todos os cupons (Admin)
 */
exports.listCoupons = async (req, res) => {
  try {
    const snapshot = await db.collection('cupons')
      .orderBy('dataCriacao', 'desc')
      .limit(100)
      .get();
    
    const cupons = [];
    snapshot.forEach(doc => {
      cupons.push({ 
        id: doc.id, 
        ...doc.data() 
      });
    });
    
    res.json({ success: true, cupons });
  } catch (error) {
    console.error('Erro ao listar cupons:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao listar cupons' 
    });
  }
};

/**
 * Criar cupom (Admin)
 */
exports.createCoupon = async (req, res) => {
  try {
    const { 
      codigo, 
      desconto, 
      tipo, 
      limite, 
      dataValidade 
    } = req.body;
    
    // Validações
    if (!codigo || !desconto || !tipo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados incompletos (código, desconto e tipo são obrigatórios)' 
      });
    }
    
    if (!['percentual', 'valor'].includes(tipo)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tipo inválido (use "percentual" ou "valor")' 
      });
    }
    
    // Verificar se cupom já existe
    const existente = await db.collection('cupons')
      .where('codigo', '==', codigo.toUpperCase().trim())
      .limit(1)
      .get();
    
    if (!existente.empty) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cupom com este código já existe' 
      });
    }
    
    // Criar cupom
    const cupomData = {
      codigo: codigo.toUpperCase().trim(),
      desconto: parseFloat(desconto),
      tipo: tipo,
      usos: 0,
      limite: limite ? parseInt(limite) : null,
      ativo: true,
      dataValidade: dataValidade ? parseInt(dataValidade) : null,
      dataCriacao: Date.now()
    };
    
    const docRef = await db.collection('cupons').add(cupomData);
    
    res.json({ 
      success: true, 
      message: 'Cupom criado com sucesso!',
      cupom: {
        id: docRef.id,
        ...cupomData
      }
    });
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao criar cupom' 
    });
  }
};

/**
 * Desativar cupom (Admin)
 */
exports.deactivateCoupon = async (req, res) => {
  try {
    const { cupomId } = req.params;
    
    await db.collection('cupons').doc(cupomId).update({
      ativo: false
    });
    
    res.json({ 
      success: true, 
      message: 'Cupom desativado com sucesso!' 
    });
  } catch (error) {
    console.error('Erro ao desativar cupom:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao desativar cupom' 
    });
  }
};

/**
 * Estatísticas de cupons (Admin)
 */
exports.getCouponStats = async (req, res) => {
  try {
    const snapshot = await db.collection('cupons').get();
    
    let total = 0;
    let ativos = 0;
    let usosTotal = 0;
    
    snapshot.forEach(doc => {
      const cupom = doc.data();
      total++;
      if (cupom.ativo) ativos++;
      usosTotal += cupom.usos || 0;
    });
    
    res.json({
      success: true,
      stats: {
        total,
        ativos,
        inativos: total - ativos,
        usosTotal
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar estatísticas' 
    });
  }
};
