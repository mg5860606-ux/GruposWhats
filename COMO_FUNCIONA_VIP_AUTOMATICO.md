# 🤖 Como Funciona o VIP Automático do Mercado Pago

## ✅ SIM, o VIP é ativado AUTOMATICAMENTE!

O sistema possui **2 formas** de ativação do VIP:

---

## 🔄 Fluxo Completo do Sistema

### 1️⃣ **Criação do Pagamento** (`POST /api/payment/create-preference`)

```javascript
// O que acontece:
1. Cliente preenche dados (grupo, horas, preço, dados pessoais)
2. Sistema cria preferência no Mercado Pago
3. Sistema salva pagamento como "pendente" no Firebase
4. Cliente é redirecionado para página de pagamento do Mercado Pago
```

**Informações configuradas:**
- ✅ `notification_url`: `${baseUrl}/api/payment/webhook` - Para receber notificações automáticas
- ✅ `external_reference`: ID do grupo - Para identificar qual grupo comprou
- ✅ URLs de retorno (sucesso, falha, pendente)

---

### 2️⃣ **Ativação AUTOMÁTICA via Webhook** (⭐ PRINCIPAL)

```javascript
// Rota: POST /api/payment/webhook
```

**Como funciona:**

1. **Cliente paga** (PIX, Cartão, etc)
2. **Mercado Pago detecta o pagamento** aprovado
3. **Mercado Pago envia notificação** para seu webhook automaticamente
4. **Seu sistema processa:**
   ```javascript
   if (payment.status === 'approved') {
     // Busca o pagamento pendente
     // Ativa VIP no grupo automaticamente:
     await db.collection('grupos').doc(groupId).update({
       vip: true,
       vipExpira: Date.now() + (hours * 60 * 60 * 1000)
     });
     
     // Move para histórico
     // Remove de pendentes
   }
   ```

**✅ É 100% AUTOMÁTICO!** O VIP é ativado assim que o Mercado Pago confirma o pagamento.

---

### 3️⃣ **Ativação MANUAL (Backup)** (`POST /api/payment/activate-vip`)

Essa rota existe como **backup** caso:
- O webhook falhe
- Administrador precise ativar manualmente
- Problema de conexão no momento do pagamento

```javascript
// Uso manual pelo admin:
{
  "groupId": "abc123",
  "hours": 24
}
```

---

## 📊 Fluxo Visual

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENTE COMPRA VIP                                       │
│    └─> Escolhe grupo, plano (12h, 24h, etc)               │
│    └─> Preenche dados pessoais                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SISTEMA CRIA PREFERÊNCIA                                 │
│    └─> Mercado Pago gera link de pagamento                 │
│    └─> Salva como "pendente" no Firebase                   │
│    └─> Redireciona cliente para Mercado Pago               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CLIENTE PAGA (PIX ou Cartão)                             │
│    └─> Mercado Pago processa pagamento                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. MERCADO PAGO ENVIA WEBHOOK (AUTOMÁTICO) 🤖              │
│    └─> POST para /api/payment/webhook                      │
│    └─> Contém: type: "payment", paymentId                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SISTEMA ATIVA VIP AUTOMATICAMENTE ✅                     │
│    └─> Verifica status = "approved"                        │
│    └─> Busca grupo pelo external_reference                 │
│    └─> Atualiza: vip = true, vipExpira = agora + horas    │
│    └─> Move pagamento para histórico                       │
│    └─> Remove de pendentes                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. GRUPO AGORA É VIP! 🌟                                    │
│    └─> Aparece em destaque no site                         │
│    └─> Válido pelo tempo comprado (12h, 24h, etc)         │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configurações Importantes

### No código (`paymentController.js`):

```javascript
// Linha 59 - URL do webhook
notification_url: `${baseUrl}/api/payment/webhook`

// Linhas 137-140 - Ativação automática
await db.collection('grupos').doc(groupId).update({
  vip: true,
  vipExpira: Date.now() + (hours * 60 * 60 * 1000)
});
```

### No `.env`:
```bash
BASE_URL=http://localhost:3000  # ⚠️ Em produção, colocar URL real
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...  # Token de acesso
```

---

## ⚠️ IMPORTANTE para Funcionar em Produção

### 1. **URL do Webhook DEVE ser pública**

O Mercado Pago precisa conseguir acessar seu webhook:

```bash
# ❌ NÃO FUNCIONA:
BASE_URL=http://localhost:3000

# ✅ FUNCIONA:
BASE_URL=https://seudominio.com
BASE_URL=https://seu-app.onrender.com
BASE_URL=https://seu-app.herokuapp.com
```

### 2. **Configurar no Painel do Mercado Pago**

No painel do Mercado Pago, você pode (opcionalmente):
- Cadastrar a URL de notificação fixa
- Ver histórico de webhooks enviados
- Reenviar webhooks que falharam

---

## 🧪 Como Testar

### Teste 1: Webhook Manual
```bash
# Simular webhook do Mercado Pago
curl -X POST http://localhost:3000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

### Teste 2: Pagamento Real
1. Criar preferência de pagamento
2. Usar ambiente sandbox do Mercado Pago
3. Fazer pagamento teste
4. Verificar logs do webhook
5. Confirmar ativação do VIP no Firebase

---

## 📝 Banco de Dados (Firebase)

### Coleções utilizadas:

1. **`grupos`** - Informações dos grupos
   ```javascript
   {
     id: "abc123",
     nome: "Grupo Top",
     vip: true,  // ← Ativado automaticamente
     vipExpira: 1234567890  // ← Timestamp de expiração
   }
   ```

2. **`pagamentosPendentes`** - Pagamentos aguardando
   ```javascript
   {
     grupoId: "abc123",
     hours: 24,
     status: "pending",
     dataCriacao: 1234567890
   }
   ```

3. **`pagamentosHistorico`** - Pagamentos aprovados
   ```javascript
   {
     grupoId: "abc123",
     hours: 24,
     status: "approved",  // ← Movido automaticamente
     paymentId: "123456789",
     dataAprovacao: 1234567890
   }
   ```

---

## ✅ Resumo

| Pergunta | Resposta |
|----------|----------|
| VIP é automático? | ✅ **SIM** |
| Como é ativado? | 🤖 **Via webhook do Mercado Pago** |
| Precisa fazer algo manual? | ❌ **NÃO** (só configurar BASE_URL correta) |
| Funciona com PIX? | ✅ **SIM** |
| Funciona com Cartão? | ✅ **SIM** |
| Quanto tempo demora? | ⚡ **Segundos** após aprovação |
| E se o webhook falhar? | 🔧 Existe rota manual de backup |

---

## 🎯 Status Atual

✅ Código implementado corretamente  
✅ Webhook configurado  
✅ Sistema automático funcionando  
⚠️ **Atenção:** Certifique-se de colocar URL pública no `BASE_URL` em produção!

---

**Conclusão:** O sistema é **100% automático**! Assim que o cliente paga, o Mercado Pago notifica seu servidor via webhook, e o VIP é ativado instantaneamente. 🚀
