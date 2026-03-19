# 💳 CHECKOUT TRANSPARENTE - IMPLEMENTADO

## ✅ O QUE FOI FEITO

Implementei o **Checkout Transparente** do Mercado Pago que permite:
- ✅ Gerar QR Code PIX no próprio site
- ✅ Processar cartão de crédito no próprio site
- ✅ SEM redirecionar para o Mercado Pago
- ✅ Planos atualizados com preços corretos

---

## 💰 PLANOS ATUALIZADOS

```javascript
{
  12: { horas: 12, preco: 9.90, nome: '12 Horas', descricao: 'Padrão' },
  24: { horas: 24, preco: 19.80, nome: '24 Horas', descricao: 'Dobro' },
  72: { horas: 72, preco: 59.40, nome: '3 Dias', descricao: 'Fim de Semana' },
  168: { horas: 168, preco: 138.60, nome: '7 Dias', descricao: 'Semana Completa' }
}
```

---

## 🌐 NOVOS ENDPOINTS

### 1. **POST /api/payment/create-pix**
Gera pagamento PIX com QR Code

**Request:**
```javascript
{
  "groupId": "grupo123",
  "planoHoras": 12,         // 12, 24, 72 ou 168
  "nome": "João Silva",
  "cpf": "12345678900",
  "email": "joao@email.com",
  "codigoCupom": "TESTE50"  // Opcional
}
```

**Response:**
```javascript
{
  "success": true,
  "paymentId": "123456789",
  "status": "pending",
  "qrCode": "00020126580014br.gov.bcb.pix...",  // ← Código para copiar
  "qrCodeBase64": "iVBORw0KGgoAAAANS...",        // ← Base64 da imagem QR
  "ticketUrl": "https://www.mercadopago.com.br/...",
  "valorOriginal": 9.90,
  "valorFinal": 4.95,
  "cupomAplicado": true,
  "economia": 4.95
}
```

### 2. **POST /api/payment/create-card**
Processa pagamento com cartão

**Request:**
```javascript
{
  "groupId": "grupo123",
  "planoHoras": 24,
  "nome": "João Silva",
  "cpf": "12345678900",
  "email": "joao@email.com",
  "token": "card_token_...",  // ← Token do cartão (gerado no frontend)
  "installments": 1,          // Número de parcelas
  "issuerId": "123",          // ID do emissor
  "codigoCupom": "TESTE50"    // Opcional
}
```

**Response:**
```javascript
{
  "success": true,
  "paymentId": "123456789",
  "status": "approved",       // ou "in_process", "rejected"
  "statusDetail": "accredited_payment",
  "valorOriginal": 19.80,
  "valorFinal": 9.90,
  "cupomAplicado": true,
  "economia": 9.90
}
```

### 3. **GET /api/payment/status/:paymentId**
Verifica status de pagamento (para polling do PIX)

**Response:**
```javascript
{
  "success": true,
  "status": "approved",
  "statusDetail": "accredited"
}
```

---

## 💻 FRONTEND - IMPLEMENTAÇÃO

### 1. Incluir SDK do Mercado Pago

No HTML:
```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

No JavaScript:
```javascript
const mp = new MercadoPago('APP_USR-756df5b8-3e62-4160-b469-9f2969dae8a6', {
  locale: 'pt-BR'
});
```

---

### 2. Fluxo de Pagamento PIX

```javascript
// Criar pagamento PIX
async function pagarComPix(groupId, planoHoras, nome, cpf, email, codigoCupom) {
  const response = await fetch('/api/payment/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      planoHoras,
      nome,
      cpf,
      email,
      codigoCupom
    })
  });

  const data = await response.json();

  if (data.success) {
    // Mostrar QR Code
    mostrarQRCode(data.qrCodeBase64, data.qrCode);
    
    // Iniciar polling para verificar pagamento
    verificarPagamentoPix(data.paymentId);
  }
}

// Mostrar QR Code
function mostrarQRCode(qrCodeBase64, qrCodeTexto) {
  // Mostrar imagem QR Code
  document.getElementById('qr-image').src = `data:image/png;base64,${qrCodeBase64}`;
  
  // Mostrar código para copiar
  document.getElementById('qr-text').value = qrCodeTexto;
  
  // Botão copiar
  document.getElementById('btn-copiar').onclick = () => {
    navigator.clipboard.writeText(qrCodeTexto);
    alert('Código PIX copiado!');
  };
}

// Polling para verificar se PIX foi pago
function verificarPagamentoPix(paymentId) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/payment/status/${paymentId}`);
    const data = await response.json();

    if (data.status === 'approved') {
      clearInterval(interval);
      alert('✅ Pagamento aprovado! VIP ativado!');
      window.location.reload();
    } else if (data.status === 'rejected' || data.status === 'cancelled') {
      clearInterval(interval);
      alert('❌ Pagamento não aprovado');
    }
  }, 3000); // Verifica a cada 3 segundos
}
```

---

### 3. Fluxo de Pagamento com Cartão

```javascript
// Criar formulário de cartão
const cardForm = mp.cardForm({
  amount: "9.90",
  iframe: true,
  form: {
    id: "form-checkout",
    cardNumber: {
      id: "form-checkout__cardNumber",
      placeholder: "Número do cartão",
    },
    expirationDate: {
      id: "form-checkout__expirationDate",
      placeholder: "MM/YY",
    },
    securityCode: {
      id: "form-checkout__securityCode",
      placeholder: "CVV",
    },
    cardholderName: {
      id: "form-checkout__cardholderName",
      placeholder: "Titular do cartão",
    },
    issuer: {
      id: "form-checkout__issuer",
      placeholder: "Banco emissor",
    },
    installments: {
      id: "form-checkout__installments",
      placeholder: "Parcelas",
    },
    identificationType: {
      id: "form-checkout__identificationType",
      placeholder: "Tipo de documento",
    },
    identificationNumber: {
      id: "form-checkout__identificationNumber",
      placeholder: "Número do documento",
    },
    cardholderEmail: {
      id: "form-checkout__cardholderEmail",
      placeholder: "E-mail",
    },
  },
  callbacks: {
    onFormMounted: error => {
      if (error) return console.warn("Form Mounted handling error: ", error);
      console.log("Form mounted");
    },
    onSubmit: event => {
      event.preventDefault();

      const {
        paymentMethodId: payment_method_id,
        issuerId: issuer_id,
        cardholderEmail: email,
        amount,
        token,
        installments,
        identificationNumber,
        identificationType,
      } = cardForm.getCardFormData();

      // Enviar para backend
      pagarComCartao(
        groupId,
        planoHoras,
        cardholderName,
        identificationNumber,
        email,
        token,
        installments,
        issuer_id,
        codigoCupom
      );
    },
  },
});

// Processar pagamento com cartão
async function pagarComCartao(
  groupId,
  planoHoras,
  nome,
  cpf,
  email,
  token,
  installments,
  issuerId,
  codigoCupom
) {
  const response = await fetch('/api/payment/create-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      planoHoras,
      nome,
      cpf,
      email,
      token,
      installments,
      issuerId,
      codigoCupom
    })
  });

  const data = await response.json();

  if (data.success) {
    if (data.status === 'approved') {
      alert('✅ Pagamento aprovado! VIP ativado!');
      window.location.reload();
    } else if (data.status === 'in_process') {
      alert('⏳ Pagamento em análise. Aguarde...');
    } else {
      alert('❌ Pagamento não aprovado: ' + data.statusDetail);
    }
  } else {
    alert('❌ Erro: ' + data.error);
  }
}
```

---

## 🎨 HTML EXEMPLO - Modal de Pagamento

```html
<!-- Modal de Pagamento VIP -->
<div id="modal-pagamento" class="modal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <h2>Impulsionar Grupo</h2>
    
    <!-- Seleção de Plano -->
    <div class="planos">
      <label>
        <input type="radio" name="plano" value="12" checked>
        12 Horas - R$ 9,90
      </label>
      <label>
        <input type="radio" name="plano" value="24">
        24 Horas - R$ 19,80
      </label>
      <label>
        <input type="radio" name="plano" value="72">
        3 Dias - R$ 59,40
      </label>
      <label>
        <input type="radio" name="plano" value="168">
        7 Dias - R$ 138,60
      </label>
    </div>

    <!-- Campo Cupom -->
    <div class="cupom">
      <input type="text" id="codigo-cupom" placeholder="Código do cupom">
      <button onclick="aplicarCupom()">Aplicar</button>
    </div>

    <!-- Total -->
    <div class="total">
      <h3>Total: R$ <span id="valor-total">9,90</span></h3>
    </div>

    <!-- Métodos de Pagamento -->
    <div class="metodos">
      <button onclick="selecionarPix()" class="btn-pix">
        Pagar com PIX
      </button>
      <button onclick="selecionarCartao()" class="btn-cartao">
        Pagar com Cartão
      </button>
    </div>

    <!-- Área PIX (oculta inicialmente) -->
    <div id="area-pix" style="display:none;">
      <h3>Pagamento via PIX</h3>
      <img id="qr-image" alt="QR Code PIX">
      <p>Escaneie o QR Code ou copie o código:</p>
      <textarea id="qr-text" readonly></textarea>
      <button id="btn-copiar">Copiar Código</button>
      <p class="aguardando">⏳ Aguardando pagamento...</p>
    </div>

    <!-- Área Cartão (oculta inicialmente) -->
    <div id="area-cartao" style="display:none;">
      <h3>Pagamento via Cartão</h3>
      <form id="form-checkout">
        <div id="form-checkout__cardNumber"></div>
        <div id="form-checkout__expirationDate"></div>
        <div id="form-checkout__securityCode"></div>
        <input type="text" id="form-checkout__cardholderName" placeholder="Titular">
        <select id="form-checkout__issuer"></select>
        <select id="form-checkout__installments"></select>
        <select id="form-checkout__identificationType"></select>
        <input type="text" id="form-checkout__identificationNumber" placeholder="CPF">
        <input type="email" id="form-checkout__cardholderEmail" placeholder="E-mail">
        <button type="submit">Pagar</button>
      </form>
    </div>
  </div>
</div>
```

---

## 🧪 TESTAR CHECKOUT TRANSPARENTE

### Teste PIX:

```bash
curl -X POST https://gruposwhats-site.onrender.com/api/payment/create-pix \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "grupo_teste",
    "planoHoras": 12,
    "nome": "Teste PIX",
    "cpf": "12345678900",
    "email": "teste@email.com"
  }'
```

**Resposta esperada:**
- ✅ `qrCode`: Código PIX para copiar
- ✅ `qrCodeBase64`: Imagem QR Code
- ✅ `paymentId`: ID para verificar status

### Teste Cartão:

```bash
curl -X POST https://gruposwhats-site.onrender.com/api/payment/create-card \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "grupo_teste",
    "planoHoras": 24,
    "nome": "Teste Cartão",
    "cpf": "12345678900",
    "email": "teste@email.com",
    "token": "token_do_cartao",
    "installments": 1
  }'
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Backend:
- [x] Planos atualizados com preços corretos
- [x] Endpoint PIX criado
- [x] Endpoint Cartão criado
- [x] Endpoint verificação de status criado
- [x] Integração com cupons mantida
- [x] Webhook funcionando

### Frontend (você precisa fazer):
- [ ] Incluir SDK Mercado Pago
- [ ] Criar modal de pagamento
- [ ] Implementar seleção de planos
- [ ] Implementar campo de cupom
- [ ] Implementar fluxo PIX
- [ ] Implementar fluxo Cartão
- [ ] Implementar polling para PIX
- [ ] Estilizar interface

---

## ⚠️ IMPORTANTE

### Public Key necessária no Frontend:

```javascript
const mp = new MercadoPago('APP_USR-756df5b8-3e62-4160-b469-9f2969dae8a6', {
  locale: 'pt-BR'
});
```

### Webhook continua funcionando:

O webhook do Mercado Pago continua ativando o VIP automaticamente quando o pagamento for aprovado, seja PIX ou Cartão!

---

## ✅ RESUMO

**Implementado:**
- ✅ 4 planos VIP (12h, 24h, 3d, 7d)
- ✅ Pagamento PIX com QR Code
- ✅ Pagamento Cartão no site
- ✅ Verificação de status
- ✅ Sistema de cupons integrado
- ✅ Webhook automático

**Você precisa:**
1. Implementar o frontend (código fornecido acima)
2. Incluir SDK do Mercado Pago
3. Criar interface do modal
4. Testar fluxo completo

**Pronto para usar!** 🚀
