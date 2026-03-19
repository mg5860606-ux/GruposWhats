const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const emailController = require('./emailController');

// Listar todos os grupos aprovados
exports.getAllGroups = async (req, res) => {
  try {
    const snapshot = await db.collection('grupos').get();

    const grupos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.aprovado !== false) {
        grupos.push({ id: doc.id, ...data });
      }
    });

    // Ordenar por data no código
    grupos.sort((a, b) => (b.dataCriacao || 0) - (a.dataCriacao || 0));

    res.json({ success: true, grupos });
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Criar novo grupo (pendente de aprovação)
exports.createGroup = async (req, res) => {
  try {
    const { nome, descricao, categoria, link, imagem, tags, proprietario, email } = req.body;

    if (!nome || !descricao || !categoria || !link || !imagem) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });
    }

    if (!link.includes('chat.whatsapp.com')) {
      return res.status(400).json({ success: false, error: 'Link inválido do WhatsApp' });
    }

    const novoGrupo = {
      nome,
      descricao,
      categoria,
      link,
      imagem,
      tags: tags || [],
      proprietario: proprietario || 'Não informado',
      email: email || '',
      vip: false,
      vipExpira: null,
      dataCriacao: Date.now(),
      visitas: 0,
      aprovado: false
    };

    const docRef = await db.collection('gruposPendentes').add(novoGrupo);

    // Enviar notificação por email para o admin
    try {
      await emailController.notifyAdminNewGroup({
        ...novoGrupo,
        id: docRef.id
      });
      console.log('✅ Email de notificação enviado para admin');
    } catch (emailError) {
      console.error('⚠️ Erro ao enviar email (grupo foi criado):', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Grupo enviado para aprovação!',
      groupId: docRef.id 
    });
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Buscar grupos pendentes (Admin)
exports.getPendingGroups = async (req, res) => {
  try {
    const snapshot = await db.collection('gruposPendentes').get();

    const grupos = [];
    snapshot.forEach(doc => {
      grupos.push({ id: doc.id, ...doc.data() });
    });

    // Ordenar por data no código
    grupos.sort((a, b) => (b.dataCriacao || 0) - (a.dataCriacao || 0));

    res.json({ success: true, grupos });
  } catch (error) {
    console.error('Erro ao buscar grupos pendentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Aprovar grupo (Admin)
exports.approveGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar grupo pendente
    const pendingDoc = await db.collection('gruposPendentes').doc(id).get();
    
    if (!pendingDoc.exists) {
      return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    }

    const grupoData = pendingDoc.data();
    grupoData.aprovado = true;

    // Adicionar aos grupos aprovados
    await db.collection('grupos').doc(id).set(grupoData);

    // Remover dos pendentes
    await db.collection('gruposPendentes').doc(id).delete();

    res.json({ success: true, message: 'Grupo aprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao aprovar grupo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Rejeitar grupo (Admin)
exports.rejectGroup = async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('gruposPendentes').doc(id).delete();

    res.json({ success: true, message: 'Grupo rejeitado!' });
  } catch (error) {
    console.error('Erro ao rejeitar grupo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Deletar grupo
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('grupos').doc(id).delete();

    res.json({ success: true, message: 'Grupo excluído!' });
  } catch (error) {
    console.error('Erro ao deletar grupo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Incrementar visitas
exports.incrementVisits = async (req, res) => {
  try {
    const { id } = req.params;

    const groupRef = db.collection('grupos').doc(id);
    const doc = await groupRef.get();

    if (doc.exists) {
      const currentVisits = doc.data().visitas || 0;
      await groupRef.update({ visitas: currentVisits + 1 });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao incrementar visitas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Ativar VIP com cupom
exports.activateVipWithCode = async (req, res) => {
  try {
    const { groupId, code } = req.body;

    if (!groupId || !code) {
      return res.status(400).json({ success: false, error: 'GroupId e code são obrigatórios' });
    }

    // Verificar se o cupom existe e não foi usado
    const cupomSnapshot = await db.collection('cupons')
      .where('code', '==', code.toUpperCase())
      .where('usado', '==', false)
      .limit(1)
      .get();

    if (cupomSnapshot.empty) {
      return res.status(404).json({ success: false, error: 'Cupom inválido ou já utilizado' });
    }

    const cupomDoc = cupomSnapshot.docs[0];
    const cupomData = cupomDoc.data();
    const hoursToAdd = cupomData.hours || 12;

    // Ativar VIP no grupo
    const groupRef = db.collection('grupos').doc(groupId);
    await groupRef.update({
      vip: true,
      vipExpira: Date.now() + (hoursToAdd * 60 * 60 * 1000)
    });

    // Marcar cupom como usado
    await db.collection('cupons').doc(cupomDoc.id).update({ usado: true });

    res.json({ 
      success: true, 
      message: `VIP ativado por ${hoursToAdd} horas!`,
      hours: hoursToAdd 
    });
  } catch (error) {
    console.error('Erro ao ativar VIP com cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Gerar cupons (Admin)
exports.generateCoupons = async (req, res) => {
  try {
    const { quantity, hours } = req.body;

    if (!quantity || !hours || quantity < 1 || quantity > 100) {
      return res.status(400).json({ success: false, error: 'Quantidade inválida (1-100)' });
    }

    const cupons = [];
    const batch = db.batch();

    for (let i = 0; i < quantity; i++) {
      const code = generateCouponCode();
      const cupomRef = db.collection('cupons').doc();
      
      const cupomData = {
        code,
        hours: parseInt(hours),
        usado: false,
        criado: Date.now()
      };

      batch.set(cupomRef, cupomData);
      cupons.push(`${code} (${hours}h)`);
    }

    await batch.commit();

    res.json({ 
      success: true, 
      message: `${quantity} cupom(ns) gerado(s)!`,
      cupons 
    });
  } catch (error) {
    console.error('Erro ao gerar cupons:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Função auxiliar para gerar código de cupom
function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `BOOST-${part1}-${part2}`;
}

// Verificar senha admin
exports.verifyAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const correctPassword = process.env.ADMIN_PASSWORD || 'gasole96';

    if (password === correctPassword) {
      res.json({ success: true, message: 'Login realizado!' });
    } else {
      res.status(401).json({ success: false, error: 'Senha incorreta' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
