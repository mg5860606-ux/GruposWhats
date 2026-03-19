# 🎯 O QUE VOCÊ PRECISA FAZER NO FRONTEND

## 📝 RESUMO SIMPLES:

Você precisa criar **1 modal/página** para pagamento VIP que:
1. ✅ Mostra os 4 planos (12h, 24h, 3d, 7d)
2. ✅ Permite aplicar cupom de desconto
3. ✅ Mostra opções: PIX ou Cartão
4. ✅ Gera QR Code PIX (sem sair do site)
5. ✅ Processa cartão (sem sair do site)

---

## 📂 ARQUIVOS QUE VOCÊ VAI MODIFICAR:

### 1. `/app/public/meus-grupos.html`
- Adicionar modal de pagamento VIP

### 2. `/app/public/script.js`
- Adicionar função para abrir modal VIP
- Adicionar funções de pagamento PIX
- Adicionar funções de pagamento Cartão

### 3. `/app/public/styles.css`
- Adicionar estilos do modal VIP

### 4. `/app/public/index.html` (header)
- Incluir SDK do Mercado Pago

---

## 🚀 PASSO A PASSO:

### PASSO 1: Incluir SDK Mercado Pago

**Arquivo:** `/app/public/index.html` e `/app/public/meus-grupos.html`

Adicione no `<head>`:
```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

---

### PASSO 2: Atualizar botão "SUPER VIP"

**Arquivo:** `/app/public/script.js`

**Encontre** a linha 199:
```javascript
window.location.href = `/impulsionar.html?grupo=${groupId}`;
```

**Troque por:**
```javascript
abrirModalVIP(groupId);
```

---

### PASSO 3: Criar Modal VIP

**Arquivo:** `/app/public/meus-grupos.html`

Adicione **ANTES do `</body>`**:

```html
<!-- Modal VIP -->
<div id="modalVIP" class="modal-vip" style="display:none;">
    <div class="modal-vip-content">
        <span class="close-modal" onclick="fecharModalVIP()">&times;</span>
        
        <h2>🌟 Impulsionar Grupo VIP</h2>
        <p id="grupo-nome-vip" style="margin-bottom: 20px;"></p>

        <!-- Seleção de Plano -->
        <div class="planos-vip">
            <label class="plano-card">
                <input type="radio" name="plano" value="12" checked>
                <div class="plano-info">
                    <h3>12 Horas</h3>
                    <p class="plano-desc">Padrão</p>
                    <p class="plano-preco">R$ 9,90</p>
                </div>
            </label>

            <label class="plano-card">
                <input type="radio" name="plano" value="24">
                <div class="plano-info">
                    <h3>24 Horas</h3>
                    <p class="plano-desc">Dobro</p>
                    <p class="plano-preco">R$ 19,80</p>
                </div>
            </label>

            <label class="plano-card">
                <input type="radio" name="plano" value="72">
                <div class="plano-info">
                    <h3>3 Dias</h3>
                    <p class="plano-desc">Fim de Semana</p>
                    <p class="plano-preco">R$ 59,40</p>
                </div>
            </label>

            <label class="plano-card">
                <input type="radio" name="plano" value="168">
                <div class="plano-info">
                    <h3>7 Dias</h3>
                    <p class="plano-desc">Semana Completa</p>
                    <p class="plano-preco">R$ 138,60</p>
                </div>
            </label>
        </div>

        <!-- Campo Cupom -->
        <div class="cupom-container">
            <input type="text" id="codigo-cupom-vip" placeholder="Código do cupom (opcional)">
            <button onclick="aplicarCupomVIP()">Aplicar</button>
        </div>
        <div id="cupom-status" style="margin-top: 5px;"></div>

        <!-- Total -->
        <div class="total-vip">
            <h3>Total: R$ <span id="valor-total-vip">9,90</span></h3>
        </div>

        <!-- Métodos de Pagamento -->
        <div class="metodos-pagamento">
            <button onclick="iniciarPagamentoPix()" class="btn-pix">
                <i class="fab fa-pix"></i> Pagar com PIX
            </button>
            <button onclick="iniciarPagamentoCartao()" class="btn-cartao">
                <i class="fas fa-credit-card"></i> Pagar com Cartão
            </button>
        </div>

        <!-- Área PIX -->
        <div id="area-pix" style="display:none;">
            <h3>Pagamento via PIX</h3>
            <div class="pix-container">
                <img id="qr-code-img" alt="QR Code PIX" style="width: 250px; height: 250px;">
                <p>Escaneie o QR Code com seu app de banco</p>
                <p>Ou copie o código abaixo:</p>
                <textarea id="qr-code-text" readonly style="width: 100%; height: 80px;"></textarea>
                <button onclick="copiarCodigoPix()">📋 Copiar Código PIX</button>
                <p class="aguardando-pagamento">⏳ Aguardando pagamento...</p>
            </div>
        </div>

        <!-- Área Cartão -->
        <div id="area-cartao" style="display:none;">
            <h3>Pagamento via Cartão</h3>
            <form id="form-cartao-vip">
                <input type="text" id="card-number" placeholder="Número do cartão" maxlength="19">
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="card-expiry" placeholder="MM/AA" maxlength="5" style="width: 50%;">
                    <input type="text" id="card-cvv" placeholder="CVV" maxlength="4" style="width: 50%;">
                </div>
                <input type="text" id="card-name" placeholder="Nome no cartão">
                <input type="text" id="card-cpf" placeholder="CPF do titular" maxlength="14">
                <button type="button" onclick="processarPagamentoCartao()">💳 Pagar Agora</button>
            </form>
        </div>
    </div>
</div>
```

---

### PASSO 4: Adicionar Funções JavaScript

**Arquivo:** `/app/public/script.js`

Adicione no final do arquivo:

```javascript
// ===== MODAL VIP =====
let grupoAtualVIP = null;
let cupomAplicado = null;
const PLANOS = {
    12: { preco: 9.90, nome: '12 Horas' },
    24: { preco: 19.80, nome: '24 Horas' },
    72: { preco: 59.40, nome: '3 Dias' },
    168: { preco: 138.60, nome: '7 Dias' }
};

// Inicializar SDK Mercado Pago
const mp = new MercadoPago('APP_USR-756df5b8-3e62-4160-b469-9f2969dae8a6', {
    locale: 'pt-BR'
});

function abrirModalVIP(grupoId) {
    grupoAtualVIP = grupoId;
    document.getElementById('modalVIP').style.display = 'flex';
    
    // Buscar nome do grupo
    fetch(`/api/groups/${grupoId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('grupo-nome-vip').textContent = `Impulsionar: ${data.group.nome}`;
            }
        });
    
    // Listener para mudar plano
    document.querySelectorAll('input[name="plano"]').forEach(radio => {
        radio.addEventListener('change', atualizarTotal);
    });
}

function fecharModalVIP() {
    document.getElementById('modalVIP').style.display = 'none';
    document.getElementById('area-pix').style.display = 'none';
    document.getElementById('area-cartao').style.display = 'none';
    cupomAplicado = null;
    atualizarTotal();
}

function atualizarTotal() {
    const planoSelecionado = document.querySelector('input[name="plano"]:checked').value;
    let preco = PLANOS[planoSelecionado].preco;
    
    // Aplicar desconto do cupom
    if (cupomAplicado) {
        if (cupomAplicado.tipo === 'percentual') {
            preco = preco * (1 - cupomAplicado.desconto / 100);
        } else {
            preco = preco - cupomAplicado.desconto;
        }
        preco = Math.max(preco, 0.50);
    }
    
    document.getElementById('valor-total-vip').textContent = preco.toFixed(2);
}

async function aplicarCupomVIP() {
    const codigo = document.getElementById('codigo-cupom-vip').value.trim();
    if (!codigo) return;
    
    try {
        const response = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            cupomAplicado = data.cupom;
            document.getElementById('cupom-status').innerHTML = `<span style="color: green;">✅ Cupom aplicado: ${data.cupom.desconto}% de desconto</span>`;
            atualizarTotal();
        } else {
            document.getElementById('cupom-status').innerHTML = `<span style="color: red;">❌ ${data.error}</span>`;
        }
    } catch (error) {
        showAlert('Erro ao validar cupom', 'error');
    }
}

// ===== PAGAMENTO PIX =====
async function iniciarPagamentoPix() {
    const planoSelecionado = document.querySelector('input[name="plano"]:checked').value;
    const codigoCupom = cupomAplicado ? cupomAplicado.codigo : null;
    
    // Pedir dados do usuário
    const nome = prompt('Seu nome completo:');
    if (!nome) return;
    
    const cpf = prompt('Seu CPF (somente números):');
    if (!cpf) return;
    
    const email = prompt('Seu e-mail:');
    if (!email) return;
    
    try {
        showAlert('Gerando PIX...', 'info');
        
        const response = await fetch('/api/payment/create-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: grupoAtualVIP,
                planoHoras: parseInt(planoSelecionado),
                nome,
                cpf: cpf.replace(/\D/g, ''),
                email,
                codigoCupom
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mostrar QR Code
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.qrCodeBase64}`;
            document.getElementById('qr-code-text').value = data.qrCode;
            document.getElementById('area-pix').style.display = 'block';
            document.querySelector('.metodos-pagamento').style.display = 'none';
            
            // Iniciar verificação de pagamento
            verificarPagamentoPix(data.paymentId);
        } else {
            showAlert('Erro ao gerar PIX: ' + data.error, 'error');
        }
    } catch (error) {
        showAlert('Erro ao gerar PIX', 'error');
    }
}

function copiarCodigoPix() {
    const codigo = document.getElementById('qr-code-text').value;
    navigator.clipboard.writeText(codigo);
    showAlert('Código PIX copiado!', 'success');
}

function verificarPagamentoPix(paymentId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/payment/status/${paymentId}`);
            const data = await response.json();
            
            if (data.status === 'approved') {
                clearInterval(interval);
                showAlert('✅ Pagamento aprovado! VIP ativado!', 'success');
                setTimeout(() => {
                    fecharModalVIP();
                    carregarMeusGrupos();
                }, 2000);
            } else if (data.status === 'rejected' || data.status === 'cancelled') {
                clearInterval(interval);
                showAlert('❌ Pagamento não aprovado', 'error');
            }
        } catch (error) {
            console.error('Erro ao verificar pagamento:', error);
        }
    }, 3000); // Verifica a cada 3 segundos
}

// ===== PAGAMENTO CARTÃO =====
async function iniciarPagamentoCartao() {
    document.getElementById('area-cartao').style.display = 'block';
    document.querySelector('.metodos-pagamento').style.display = 'none';
}

async function processarPagamentoCartao() {
    const planoSelecionado = document.querySelector('input[name="plano"]:checked').value;
    const codigoCupom = cupomAplicado ? cupomAplicado.codigo : null;
    
    // Pegar dados do formulário
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;
    const cardName = document.getElementById('card-name').value;
    const cardCpf = document.getElementById('card-cpf').value.replace(/\D/g, '');
    
    if (!cardNumber || !cardExpiry || !cardCvv || !cardName || !cardCpf) {
        showAlert('Preencha todos os dados do cartão', 'error');
        return;
    }
    
    try {
        showAlert('Processando pagamento...', 'info');
        
        // Separar mês e ano
        const [mes, ano] = cardExpiry.split('/');
        
        // Criar token do cartão
        const token = await mp.fields.createCardToken({
            cardNumber,
            cardholderName: cardName,
            cardExpirationMonth: mes,
            cardExpirationYear: `20${ano}`,
            securityCode: cardCvv,
            identificationType: 'CPF',
            identificationNumber: cardCpf
        });
        
        // Enviar para backend
        const response = await fetch('/api/payment/create-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: grupoAtualVIP,
                planoHoras: parseInt(planoSelecionado),
                nome: cardName,
                cpf: cardCpf,
                email: 'email@exemplo.com', // Ou pedir
                token: token.id,
                installments: 1,
                codigoCupom
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.status === 'approved') {
            showAlert('✅ Pagamento aprovado! VIP ativado!', 'success');
            setTimeout(() => {
                fecharModalVIP();
                carregarMeusGrupos();
            }, 2000);
        } else {
            showAlert('❌ Pagamento não aprovado: ' + (data.statusDetail || data.error), 'error');
        }
    } catch (error) {
        showAlert('Erro ao processar cartão: ' + error.message, 'error');
    }
}
```

---

### PASSO 5: Adicionar CSS

**Arquivo:** `/app/public/styles.css`

Adicione no final:

```css
/* ===== MODAL VIP ===== */
.modal-vip {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    align-items: center;
    justify-content: center;
}

.modal-vip-content {
    background-color: white;
    padding: 30px;
    border-radius: 15px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
}

.close-modal {
    position: absolute;
    right: 20px;
    top: 20px;
    font-size: 30px;
    cursor: pointer;
}

.planos-vip {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    margin: 20px 0;
}

.plano-card {
    border: 2px solid #ddd;
    border-radius: 10px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.3s;
}

.plano-card:hover {
    border-color: #25D366;
}

.plano-card input[type="radio"] {
    display: none;
}

.plano-card input[type="radio"]:checked + .plano-info {
    background-color: #E8F5E9;
}

.plano-info h3 {
    margin: 0;
    font-size: 18px;
}

.plano-desc {
    color: #666;
    margin: 5px 0;
}

.plano-preco {
    font-size: 20px;
    font-weight: bold;
    color: #25D366;
}

.cupom-container {
    display: flex;
    gap: 10px;
    margin: 20px 0;
}

.cupom-container input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
}

.cupom-container button {
    padding: 10px 20px;
    background: #25D366;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.total-vip {
    text-align: center;
    margin: 20px 0;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 10px;
}

.metodos-pagamento {
    display: flex;
    gap: 15px;
    margin-top: 20px;
}

.btn-pix, .btn-cartao {
    flex: 1;
    padding: 15px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-pix {
    background: #32BCAD;
    color: white;
}

.btn-cartao {
    background: #FF6B00;
    color: white;
}

.pix-container {
    text-align: center;
    margin-top: 20px;
}

.pix-container img {
    margin: 20px auto;
    display: block;
}

.pix-container textarea {
    width: 100%;
    margin: 10px 0;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
}

.pix-container button {
    padding: 10px 20px;
    background: #25D366;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.aguardando-pagamento {
    margin-top: 15px;
    font-weight: bold;
    color: #FF9800;
}

#form-cartao-vip input {
    width: 100%;
    padding: 12px;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 5px;
}

#form-cartao-vip button {
    width: 100%;
    padding: 15px;
    background: #FF6B00;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 15px;
}
```

---

## ✅ PRONTO! É SÓ ISSO!

Depois de fazer essas mudanças:

1. ✅ Clique em "SUPER VIP" em qualquer grupo
2. ✅ Modal abre com os 4 planos
3. ✅ Escolha plano e método (PIX ou Cartão)
4. ✅ PIX: Mostra QR Code
5. ✅ Cartão: Formulário para pagar

**Tudo no próprio site, sem redirecionar!** 🚀
