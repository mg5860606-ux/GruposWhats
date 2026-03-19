// ===== ADMIN - PEDIDOS DE CUPONS =====

// Verificar configuração de email ao carregar
async function verificarEmailConfig() {
    try {
        const response = await fetch('/api/coupon-orders/check-email-config');
        const data = await response.json();
        
        const statusDiv = document.getElementById('email-config-status');
        if (data.configured) {
            statusDiv.innerHTML = '<span style="color: green;">✅ Email configurado e pronto!</span>';
        } else {
            statusDiv.innerHTML = '<span style="color: orange;">⚠️ Email não configurado</span>';
        }
    } catch (error) {
        console.error('Erro ao verificar config:', error);
    }
}

async function configurarEmailRapido() {
    const senha = 'favuvtsxsgtrywfz'; // Senha sem espaços
    
    if (!confirm('Configurar email automaticamente?\n\nEmail: mg5860606@gmail.com\nSenha: favu vtsx sgtr ywfz\n\nIsso vai salvar no sistema e ativar os emails.')) {
        return;
    }
    
    try {
        showAlert('Salvando configuração...', 'info');
        
        const response = await fetch('/api/coupon-orders/save-email-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: senha })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Email configurado com sucesso!\n\nPronto para enviar notificações e cupons!', 'success');
            verificarEmailConfig();
            
            // Testar envio
            setTimeout(() => {
                if (confirm('Deseja enviar um email de teste agora?')) {
                    testarEmail();
                }
            }, 1500);
        } else {
            showAlert('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        showAlert('Erro ao salvar configuração', 'error');
    }
}

async function carregarPedidosCupons() {
    try {
        const response = await fetch('/api/coupon-orders/orders');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('pedidos-cupons-tbody');
            tbody.innerHTML = '';
            
            if (data.pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #666;">Nenhum pedido de cupom encontrado</td></tr>';
                return;
            }
            
            data.pedidos.forEach(pedido => {
                const tr = document.createElement('tr');
                const dataCriacao = new Date(pedido.dataCriacao).toLocaleString('pt-BR');
                const statusBadge = pedido.status === 'confirmed' 
                    ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✅ Confirmado</span>'
                    : '<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⏳ Pendente</span>';
                
                tr.innerHTML = `
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${pedido.tipo.toUpperCase()}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${pedido.quantidade}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">R$ ${pedido.preco.toFixed(2)}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${pedido.nome}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${pedido.email}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;"><code>${pedido.codigoCupom}</code></td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${statusBadge}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-size: 12px;">${dataCriacao}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">
                        ${pedido.status === 'pending' ? `
                            <button onclick="confirmarPagamentoCupom('${pedido.id}')" 
                                    style="background: #25D366; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px; font-size: 12px;">
                                ✅ Confirmar
                            </button>
                        ` : ''}
                        <button onclick="reenviarEmailCupom('${pedido.id}')" 
                                style="background: #2196F3; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                            📧 Reenviar
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        showAlert('Erro ao carregar pedidos de cupons', 'error');
    }
}

async function confirmarPagamentoCupom(orderId) {
    if (!confirm('⚠️ CONFIRMAR PAGAMENTO?\n\nIsso vai:\n✅ Criar o cupom no sistema\n✅ Enviar email para o cliente\n\nTem certeza?')) return;
    
    try {
        showAlert('Processando...', 'info');
        
        const response = await fetch('/api/coupon-orders/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`✅ ${data.message}\n\n📋 Código: ${data.codigo}\n📧 Email enviado para o cliente!`, 'success');
            carregarPedidosCupons();
        } else {
            showAlert('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        showAlert('Erro ao confirmar pagamento', 'error');
    }
}

async function reenviarEmailCupom(orderId) {
    if (!confirm('Reenviar cupom por email para o cliente?')) return;
    
    try {
        showAlert('Enviando email...', 'info');
        
        const response = await fetch('/api/coupon-orders/resend-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Email reenviado com sucesso!', 'success');
        } else {
            showAlert('Erro ao enviar email: ' + data.error, 'error');
        }
    } catch (error) {
        showAlert('Erro ao enviar email', 'error');
    }
}

async function testarEmail() {
    try {
        showAlert('Enviando email de teste para mg5860606@gmail.com...', 'info');
        
        const response = await fetch('/api/coupon-orders/test-email');
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Email de teste enviado!\n\nVerifique sua caixa de entrada: mg5860606@gmail.com', 'success');
        } else {
            showAlert('❌ Erro ao enviar email.\n\nVerifique se a senha está configurada corretamente.', 'error');
        }
    } catch (error) {
        showAlert('Erro ao testar email', 'error');
    }
}
