# 🚀 Guia Passo a Passo: Configurar Mercado Pago

## 📋 RESUMO PARA CONFIGURAÇÃO COMPLETA

---

## 🎯 O QUE PRECISO CONFIGURAR?

1. **Loja de Cupons** - Sistema de venda de cupons/vouchers
2. **Planos VIP de Impulsionamento** - Destacar grupos por tempo (12h, 24h, 48h)

---

## 🔑 PASSO 1: OBTER CREDENCIAIS DO MERCADO PAGO

### 1.1 Criar/Acessar Conta Mercado Pago
- Acesse: https://www.mercadopago.com.br/developers
- Faça login ou crie uma conta

### 1.2 Obter Access Token e Public Key

**Para TESTES (Sandbox):**
1. Vá em: Suas integrações → Criar aplicação
2. Anote:
   - `TEST_ACCESS_TOKEN` (começa com TEST-...)
   - `TEST_PUBLIC_KEY` (começa com TEST-...)

**Para PRODUÇÃO:**
1. Vá em: Suas integrações → Credenciais
2. Anote:
   - `PRODUCTION_ACCESS_TOKEN` (começa com APP_USR-...)
   - `PRODUCTION_PUBLIC_KEY` (começa com APP_USR-...)

### 1.3 Configurar no arquivo `.env`

```bash
# No arquivo /app/.env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3474087722669713-031119-ef409f0e5e87e4746d3236c176084bf3-251464317
MERCADOPAGO_PUBLIC_KEY=APP_USR-61db44b5-fa4d-4fcb-8482-1db693f326e2
BASE_URL=https://seu-dominio.com
```

---

## 🛍️ PASSO 2: CONFIGURAR LOJA DE CUPONS

### 2.1 Estrutura de Cupons no Firebase

```javascript
// Coleção: cupons
cupons/
 └─ cupom_123/
     ├─ codigo: "PROMO2024"
     ├─ desconto: 20  // Porcentagem ou valor fixo
     ├─ tipo: "percentual"  // ou "valor"
     ├─ usos: 0
     ├─ limite: 100  // Máximo de usos
     ├─ ativo: true
     ├─ dataValidade: 1234567890
     └─ dataCriacao: 1234567890
```

### 2.2 Criar Controller de Cupons

Criar arquivo `/app/controllers/couponController.js`:

```javascript
const { db } = require('../config/firebase');

// Validar cupom
exports.validateCoupon = async (req, res) => {
  try {
    const { codigo } = req.body;
    
    const snapshot = await db.collection('cupons')
      .where('codigo', '==', codigo.toUpperCase())
      .where('ativo', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.json({ success: false, error: 'Cupom inválido' });
    }
    
    const cupomDoc = snapshot.docs[0];
    const cupom = cupomDoc.data();
    
    // Verificar validade
    if (cupom.dataValidade && cupom.dataValidade < Date.now()) {
      return res.json({ success: false, error: 'Cupom expirado' });
    }
    
    // Verificar limite de usos
    if (cupom.limite && cupom.usos >= cupom.limite) {
      return res.json({ success: false, error: 'Cupom esgotado' });
    }
    
    res.json({ 
      success: true, 
      cupom: {
        id: cupomDoc.id,
        codigo: cupom.codigo,
        desconto: cupom.desconto,
        tipo: cupom.tipo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Aplicar cupom (incrementar uso)
exports.applyCoupon = async (req, res) => {
  try {
    const { cupomId } = req.body;
    
    const cupomRef = db.collection('cupons').doc(cupomId);
    const cupomDoc = await cupomRef.get();
    
    if (!cupomDoc.exists) {
      return res.json({ success: false, error: 'Cupom não encontrado' });
    }
    
    await cupomRef.update({
      usos: cupomDoc.data().usos + 1
    });
    
    res.json({ success: true, message: 'Cupom aplicado!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 2.3 Criar Rotas de Cupons

Criar arquivo `/app/routes/coupons.js`:

```javascript
const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

router.post('/validate', couponController.validateCoupon);
router.post('/apply', couponController.applyCoupon);

module.exports = router;
```

### 2.4 Registrar Rotas no server.js

No arquivo `/app/server.js`, adicionar:

```javascript
const couponsRouter = require('./routes/coupons');
app.use('/api/coupons', couponsRouter);
```

---

## 💎 PASSO 3: CONFIGURAR PLANOS VIP

### 3.1 Estrutura de Planos no Firebase

```javascript
// Coleção: planosVip
planosVip/
 └─ plano_12h/
     ├─ nome: "VIP 12 Horas"
     ├─ duracao: 12  // Horas
     ├─ preco: 19.90
     ├─ descricao: "Destaque por 12 horas"
     ├─ beneficios: ["Aparecer no topo", "Badge VIP", "Mais visitas"]
     └─ ativo: true

 └─ plano_24h/
     ├─ nome: "VIP 24 Horas"
     ├─ duracao: 24
     ├─ preco: 29.90
     ├─ descricao: "Destaque por 24 horas"
     └─ ativo: true

 └─ plano_48h/
     ├─ nome: "VIP 48 Horas"
     ├─ duracao: 48
     ├─ preco: 49.90
     ├─ descricao: "Destaque por 2 dias"
     └─ ativo: true
```

### 3.2 Atualizar Controller de Pagamento

No arquivo `/app/controllers/paymentController.js`, atualizar a função `createPaymentPreference`:

```javascript
exports.createPaymentPreference = async (req, res) => {
  try {
    const { 
      groupId, 
      hours, 
      price, 
      nome, 
      cpf, 
      email, 
      telefone, 
      metodoPagamento,
      cupomId  // ← NOVO: ID do cupom se aplicado
    } = req.body;

    let precoFinal = parseFloat(price);
    let cupomAplicado = null;

    // Aplicar cupom se fornecido
    if (cupomId) {
      const cupomDoc = await db.collection('cupons').doc(cupomId).get();
      if (cupomDoc.exists) {
        const cupom = cupomDoc.data();
        
        if (cupom.tipo === 'percentual') {
          precoFinal = precoFinal * (1 - cupom.desconto / 100);
        } else if (cupom.tipo === 'valor') {
          precoFinal = precoFinal - cupom.desconto;
        }
        
        cupomAplicado = {
          id: cupomId,
          codigo: cupom.codigo,
          desconto: cupom.desconto,
          tipo: cupom.tipo
        };
      }
    }

    // Garantir preço mínimo
    precoFinal = Math.max(precoFinal, 0.50);

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
          unit_price: precoFinal  // ← Preço com desconto
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
      valorOriginal: parseFloat(price),
      valorFinal: precoFinal,
      cupom: cupomAplicado,  // ← Salva info do cupom
      hours: parseInt(hours),
      metodoPagamento: metodoPagamento || 'Não especificado',
      status: 'pending',
      dataCriacao: Date.now()
    });

    // Se cupom foi usado, incrementar contador
    if (cupomId) {
      await db.collection('cupons').doc(cupomId).update({
        usos: admin.firestore.FieldValue.increment(1)
      });
    }

    res.json({ 
      success: true, 
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      precoFinal: precoFinal,
      cupomAplicado: cupomAplicado
    });
  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao processar pagamento' 
    });
  }
};
```

---

## 🌐 PASSO 4: CONFIGURAR WEBHOOK (URL PÚBLICA)

### 4.1 Configurar BASE_URL

No arquivo `.env`, colocar URL pública:

```bash
# ❌ NÃO FUNCIONA em produção
BASE_URL=http://localhost:3000

# ✅ USAR URL PÚBLICA
BASE_URL=https://seu-dominio.com
BASE_URL=https://seu-app.render.com
BASE_URL=https://seu-app.herokuapp.com
```

### 4.2 Configurar Webhook no Painel Mercado Pago (Opcional)

1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em: Suas integrações → [Sua Aplicação] → Webhooks
3. Configure:
   - **URL:** `https://seu-dominio.com/api/payment/webhook`
   - **Eventos:** `payment`

### 4.3 Testar Webhook

```bash
# Teste local (use ngrok ou similar para expor localhost)
curl -X POST http://localhost:3000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

---

## 🎨 PASSO 5: INTERFACE FRONTEND

### 5.1 Criar Página de Planos VIP

Exemplo de componente React:

```jsx
// Página de Planos VIP
const PlanosVIP = ({ grupoId }) => {
  const [planos, setPlanos] = useState([]);
  const [cupom, setCupom] = useState('');
  const [cupomValido, setCupomValido] = useState(null);

  const planosPadrao = [
    { id: '12h', nome: 'VIP 12 Horas', duracao: 12, preco: 19.90 },
    { id: '24h', nome: 'VIP 24 Horas', duracao: 24, preco: 29.90 },
    { id: '48h', nome: 'VIP 48 Horas', duracao: 48, preco: 49.90 },
  ];

  const validarCupom = async () => {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: cupom })
    });
    const data = await res.json();
    if (data.success) {
      setCupomValido(data.cupom);
      alert('Cupom aplicado com sucesso!');
    } else {
      alert(data.error);
    }
  };

  const comprarPlano = async (plano) => {
    let preco = plano.preco;
    
    // Aplicar desconto do cupom
    if (cupomValido) {
      if (cupomValido.tipo === 'percentual') {
        preco = preco * (1 - cupomValido.desconto / 100);
      } else {
        preco = preco - cupomValido.desconto;
      }
    }

    const res = await fetch('/api/payment/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: grupoId,
        hours: plano.duracao,
        price: preco,
        nome: 'Nome do Cliente',
        email: 'email@exemplo.com',
        cpf: '12345678900',
        telefone: '11999999999',
        metodoPagamento: 'pix',
        cupomId: cupomValido?.id
      })
    });

    const data = await res.json();
    if (data.success) {
      // Redirecionar para Mercado Pago
      window.location.href = data.initPoint;
    }
  };

  return (
    <div>
      <h2>Planos VIP</h2>
      
      {/* Campo de Cupom */}
      <div>
        <input 
          type="text" 
          placeholder="Código do cupom"
          value={cupom}
          onChange={(e) => setCupom(e.target.value)}
        />
        <button onClick={validarCupom}>Aplicar Cupom</button>
        {cupomValido && <span>✅ {cupomValido.desconto}% de desconto</span>}
      </div>

      {/* Lista de Planos */}
      {planosPadrao.map(plano => {
        let precoFinal = plano.preco;
        if (cupomValido?.tipo === 'percentual') {
          precoFinal = precoFinal * (1 - cupomValido.desconto / 100);
        }
        
        return (
          <div key={plano.id}>
            <h3>{plano.nome}</h3>
            <p>{plano.duracao} horas de destaque</p>
            {cupomValido ? (
              <>
                <p><s>R$ {plano.preco.toFixed(2)}</s></p>
                <p><strong>R$ {precoFinal.toFixed(2)}</strong></p>
              </>
            ) : (
              <p>R$ {plano.preco.toFixed(2)}</p>
            )}
            <button onClick={() => comprarPlano(plano)}>
              Comprar Agora
            </button>
          </div>
        );
      })}
    </div>
  );
};
```

---

## ✅ CHECKLIST FINAL

### Mercado Pago:
- [ ] Credenciais obtidas (ACCESS_TOKEN, PUBLIC_KEY)
- [ ] Configurado no `.env`
- [ ] SDK atualizado para v2.4.0
- [ ] BASE_URL pública configurada
- [ ] Webhook testado

### Cupons:
- [ ] Coleção `cupons` criada no Firebase
- [ ] Controller de cupons criado
- [ ] Rotas de cupons registradas
- [ ] Sistema de validação funcionando
- [ ] Sistema de aplicação de desconto funcionando

### Planos VIP:
- [ ] Coleção `planosVip` criada no Firebase
- [ ] Controller de pagamento atualizado com cupons
- [ ] Sistema de desconto integrado
- [ ] Webhook processando pagamentos
- [ ] VIP sendo ativado automaticamente

### Frontend:
- [ ] Página de planos VIP criada
- [ ] Campo de cupom implementado
- [ ] Integração com Mercado Pago funcionando
- [ ] Redirecionamento para pagamento OK

---

## 🧪 TESTE COMPLETO

### 1. Criar Cupom de Teste no Firebase:

```javascript
{
  codigo: "TESTE50",
  desconto: 50,
  tipo: "percentual",
  usos: 0,
  limite: 100,
  ativo: true,
  dataValidade: Date.now() + (30 * 24 * 60 * 60 * 1000)
}
```

### 2. Testar Fluxo:

1. ✅ Acessar página de planos VIP
2. ✅ Digitar cupom "TESTE50"
3. ✅ Ver desconto aplicado (50%)
4. ✅ Clicar em "Comprar"
5. ✅ Ser redirecionado para Mercado Pago
6. ✅ Fazer pagamento teste
7. ✅ Verificar webhook recebido
8. ✅ Confirmar VIP ativado no grupo
9. ✅ Verificar cupom incrementado

---

## 📞 SUPORTE

**Documentação Mercado Pago:**
- https://www.mercadopago.com.br/developers/pt/docs

**Problemas Comuns:**

1. **Webhook não funciona**
   - Verificar se BASE_URL está pública
   - Testar URL com: https://webhook.site

2. **Pagamento não ativa VIP**
   - Verificar logs do webhook
   - Confirmar external_reference está correto

3. **Cupom não aplica desconto**
   - Verificar se cupom está ativo
   - Confirmar validade não expirou

---

## 📋 RESUMO PARA CHAT GPT

**Cole isso no Chat GPT:**

```
Preciso configurar Mercado Pago no meu sistema Node.js + Express + Firebase.

Tenho:
- Sistema de grupos WhatsApp
- Impulsionamento VIP (12h, 24h, 48h)
- Firebase Firestore como banco de dados
- Mercado Pago SDK v2.4.0 instalado

Preciso implementar:
1. Sistema de cupons de desconto (percentual e valor fixo)
2. Planos VIP de impulsionamento com preços variados
3. Integração de cupons no checkout
4. Webhook automático do Mercado Pago

Estrutura atual:
- /app/controllers/paymentController.js (já tem sistema VIP)
- /app/routes/payment.js (rotas de pagamento)
- /app/server.js (servidor Express)
- Firebase Firestore (grupos, pagamentosPendentes, pagamentosHistorico)

Me ajude a:
1. Criar controller de cupons completo
2. Atualizar paymentController para aceitar cupons
3. Criar interface frontend para aplicar cupons
4. Garantir que webhook continue funcionando
```

---

**✅ ESTÁ TUDO DOCUMENTADO E PRONTO PARA USAR!**
