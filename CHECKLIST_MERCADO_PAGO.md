# 🔑 CHECKLIST: O QUE FAZER NO MERCADO PAGO

## 📋 PASSOS NECESSÁRIOS NO PAINEL MERCADO PAGO

---

## 🎯 ETAPA 1: CRIAR/ACESSAR CONTA

### 1. Acesse o Mercado Pago Developers
- **URL:** https://www.mercadopago.com.br/developers
- Faça login com sua conta Mercado Pago
- Se não tem conta, crie uma em: https://www.mercadopago.com.br/

---

## 🔐 ETAPA 2: OBTER CREDENCIAIS (OBRIGATÓRIO)

### 2.1 Criar uma Aplicação

1. No painel: **"Suas integrações"** → **"Criar aplicação"**
2. Preencha:
   - **Nome da aplicação:** "Sistema VIP Grupos WhatsApp" (ou o nome que preferir)
   - **Modelo de integração:** Online Payments / Checkout Pro
   - **Produto:** Checkout Pro
3. Clique em **"Criar aplicação"**

### 2.2 Obter Credenciais de TESTE (para testar)

1. Vá em: **"Suas integrações"** → **[Sua Aplicação]** → **"Credenciais de teste"**
2. **Copie e salve:**
   - ✅ **Public Key (teste):** Começa com `TEST-...`
   - ✅ **Access Token (teste):** Começa com `TEST-...`

### 2.3 Obter Credenciais de PRODUÇÃO (para usar de verdade)

1. **IMPORTANTE:** Você precisa ter a conta verificada!
2. Vá em: **"Suas integrações"** → **[Sua Aplicação]** → **"Credenciais de produção"**
3. **Copie e salve:**
   - ✅ **Public Key (produção):** Começa com `APP_USR-...`
   - ✅ **Access Token (produção):** Começa com `APP_USR-...`

### 2.4 Atualizar no seu sistema

Coloque as credenciais no arquivo **`.env`** do seu projeto:

```bash
# Para TESTE:
MERCADOPAGO_ACCESS_TOKEN=TEST-3474087722669713-031119-...
MERCADOPAGO_PUBLIC_KEY=TEST-61db44b5-fa4d-4fcb-...

# Para PRODUÇÃO:
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3474087722669713-031119-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-61db44b5-fa4d-4fcb-...
```

---

## 🔔 ETAPA 3: CONFIGURAR WEBHOOK (OBRIGATÓRIO)

O webhook é essencial para o sistema funcionar automaticamente!

### 3.1 Acessar Configuração de Webhooks

1. Vá em: **"Suas integrações"** → **[Sua Aplicação]** → **"Webhooks"**
2. Clique em **"Configurar notificações"**

### 3.2 Configurar URL de Notificação

**⚠️ IMPORTANTE:** A URL precisa ser pública (não pode ser localhost)

1. **URL de notificação:**
   ```
   https://SEU-DOMINIO.com/api/payment/webhook
   ```
   
   Exemplos de URLs válidas:
   - `https://gruposwhats.com/api/payment/webhook`
   - `https://seu-app.onrender.com/api/payment/webhook`
   - `https://seu-app.herokuapp.com/api/payment/webhook`
   - `https://seu-app.vercel.app/api/payment/webhook`

2. **Eventos a notificar:**
   - ✅ Marque: **"Pagamentos"** (payment)
   - Pode deixar os outros desmarcados

3. Clique em **"Salvar"**

### 3.3 Testar Webhook

Depois de salvar, o Mercado Pago oferece um botão **"Enviar teste"**:
1. Clique em **"Enviar teste"**
2. Verifique nos logs do seu servidor se recebeu a notificação
3. Se recebeu, está funcionando! ✅

---

## 🧪 ETAPA 4: TESTAR PAGAMENTOS (RECOMENDADO)

### 4.1 Usar Ambiente de Testes

Para testar sem gastar dinheiro:

1. Use as **credenciais de TESTE** (TEST-...)
2. Use cartões de teste do Mercado Pago:

**Cartões de Teste:**
- **Visa aprovado:** 4509 9535 6623 3704
- **Mastercard aprovado:** 5031 7557 3453 0604
- **PIX (teste):** Use qualquer CPF válido

**Dados do titular:**
- **Nome:** APRO (para aprovar) ou OTHE (para rejeitar)
- **CPF:** 12345678909
- **Data de validade:** Qualquer data futura (ex: 11/25)
- **CVV:** 123

### 4.2 Fazer um Pagamento Teste

1. No seu sistema, escolha um plano VIP
2. Preencha os dados
3. Clique em pagar
4. Use os cartões de teste acima
5. Verifique se:
   - ✅ Pagamento foi aprovado
   - ✅ Webhook foi recebido (veja logs)
   - ✅ VIP foi ativado no grupo
   - ✅ Se usou cupom, foi incrementado

---

## 💰 ETAPA 5: ATIVAR PRODUÇÃO (QUANDO PRONTO)

### 5.1 Verificar Conta

Para receber pagamentos reais, sua conta precisa estar verificada:

1. Vá em: **"Configurações"** → **"Dados da conta"**
2. Complete:
   - ✅ Dados pessoais ou da empresa
   - ✅ Dados bancários (para receber)
   - ✅ Documentos (CPF/CNPJ)

### 5.2 Trocar para Credenciais de Produção

No arquivo `.env`:
```bash
# Troque de TEST para APP_USR
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3474087722669713-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-61db44b5-fa4d-4fcb-...
```

### 5.3 Atualizar Webhook para URL de Produção

No painel do Mercado Pago:
1. Atualize a URL do webhook para a URL de produção
2. Teste novamente com pagamento real

---

## 📊 ETAPA 6: CONFIGURAÇÕES OPCIONAIS (RECOMENDADO)

### 6.1 Configurar Taxas e Parcelamento

1. Vá em: **"Vendas"** → **"Configurações"**
2. Configure:
   - **Parcelas:** Quantas vezes pode parcelar
   - **Taxa de parcelamento:** Quem paga (você ou cliente)
   - **Métodos de pagamento:** Ativar/desativar PIX, cartão, boleto

### 6.2 Personalizar Checkout

1. Vá em: **"Suas integrações"** → **[Sua Aplicação]** → **"Personalização"**
2. Configure:
   - **Nome da loja:** Como aparece no checkout
   - **Logo:** Adicionar logo da sua empresa
   - **Cores:** Personalizar cores do checkout

### 6.3 Habilitar PIX

Se PIX não estiver habilitado:
1. Vá em: **"Vendas"** → **"Configurações"** → **"Meios de pagamento"**
2. Ative o **PIX**
3. Configure chave PIX (se necessário)

---

## 🔍 ETAPA 7: MONITORAR PAGAMENTOS

### 7.1 Ver Histórico de Pagamentos

1. Acesse: **"Vendas"** → **"Histórico"**
2. Aqui você vê todos os pagamentos recebidos

### 7.2 Ver Logs de Webhook

1. Acesse: **"Suas integrações"** → **[Sua Aplicação]** → **"Webhooks"**
2. Clique em **"Ver logs"**
3. Aqui você vê todas as notificações enviadas

### 7.3 Verificar Webhooks Falhados

Se algum webhook falhou:
1. No log, clique em **"Reenviar"**
2. O Mercado Pago tenta enviar novamente
3. Verifique seus logs do servidor para ver o erro

---

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### ❌ Webhook não funciona

**Causas:**
- URL não é pública (está usando localhost)
- URL está errada ou com typo
- Servidor está fora do ar

**Solução:**
1. Use ngrok para testar local: `ngrok http 3000`
2. Use a URL do ngrok no webhook temporariamente
3. Em produção, use URL real (Render, Vercel, etc)

### ❌ Credenciais inválidas

**Causas:**
- Usando credenciais de teste em produção
- Copiou errado do painel

**Solução:**
1. Revise o `.env`
2. Copie novamente do painel
3. Reinicie o servidor

### ❌ Pagamento não ativa VIP

**Causas:**
- Webhook não foi configurado
- Webhook não consegue acessar servidor
- Erro no código do webhook

**Solução:**
1. Verifique logs do webhook no Mercado Pago
2. Verifique logs do seu servidor
3. Teste webhook manualmente com curl

---

## ✅ CHECKLIST FINAL

Marque o que você já fez:

### Configuração Inicial:
- [ ] Conta Mercado Pago criada
- [ ] Aplicação criada no painel
- [ ] Credenciais de TESTE obtidas
- [ ] Credenciais de PRODUÇÃO obtidas
- [ ] Credenciais adicionadas no `.env`

### Webhook:
- [ ] Webhook configurado no painel
- [ ] URL do webhook está pública
- [ ] Webhook testado e funcionando
- [ ] Logs do webhook verificados

### Testes:
- [ ] Pagamento teste realizado
- [ ] VIP ativado automaticamente
- [ ] Cupom incrementado (se usado)
- [ ] Fluxo completo testado

### Produção:
- [ ] Conta verificada (dados pessoais/bancários)
- [ ] Credenciais de produção ativadas
- [ ] Webhook atualizado para URL de produção
- [ ] PIX habilitado
- [ ] Parcelamento configurado
- [ ] Pagamento real testado

---

## 📞 SUPORTE MERCADO PAGO

Se precisar de ajuda:

- **Documentação:** https://www.mercadopago.com.br/developers/pt/docs
- **Suporte:** https://www.mercadopago.com.br/developers/pt/support
- **Comunidade:** https://www.mercadopago.com.br/developers/pt/community

---

## 🎯 RESUMO RÁPIDO

**O MÍNIMO QUE VOCÊ PRECISA FAZER:**

1. ✅ Criar aplicação no Mercado Pago
2. ✅ Copiar ACCESS_TOKEN e PUBLIC_KEY
3. ✅ Colocar no arquivo `.env`
4. ✅ Configurar webhook com URL pública
5. ✅ Testar pagamento
6. ✅ Verificar conta para produção

**PRONTO! Sistema funcionando!** 🚀

---

**📝 DICA:** Comece com ambiente de TESTE e só vá para PRODUÇÃO quando tudo estiver funcionando perfeitamente!
