// ===== ADMIN - PEDIDOS DE CUPONS =====

async function carregarPedidosCupons() {
    try {
        const response = await fetch('/api/coupon-orders/orders');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('pedidos-cupons-tbody');
            tbody.innerHTML = '';
            
            if (data.pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum pedido de cupom encontrado</td></tr>';
                return;
            }
            
            data.pedidos.forEach(pedido => {
                const tr = document.createElement('tr');
                const dataCriacao = new Date(pedido.dataCriacao).toLocaleString('pt-BR');
                const statusBadge = pedido.status === 'confirmed' 
                    ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px;">✅ Confirmado</span>'
                    : '<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px;">⏳ Pendente</span>';
                
                tr.innerHTML = `
                    <td>${pedido.tipo.toUpperCase()}</td>
                    <td>${pedido.quantidade}</td>
                    <td>R$ ${pedido.preco.toFixed(2)}</td>
                    <td>${pedido.nome}</td>
                    <td>${pedido.email}</td>
                    <td>${pedido.codigoCupom}</td>
                    <td>${statusBadge}</td>
                    <td>${dataCriacao}</td>
                    <td>
                        ${pedido.status === 'pending' ? `
                            <button onclick="confirmarPagamentoCupom('${pedido.id}')" 
                                    style="background: #25D366; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;">
                                ✅ Confirmar
                            </button>
                        ` : ''}
                        <button onclick="reenviarEmailCupom('${pedido.id}')" 
                                style="background: #2196F3; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">
                            📧 Reenviar Email
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
    if (!confirm('Confirmar pagamento e enviar cupom por email?')) return;
    
    try {
        showAlert('Processando...', 'info');
        
        const response = await fetch('/api/coupon-orders/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`✅ ${data.message}\nCódigo: ${data.codigo}`, 'success');
            carregarPedidosCupons();
        } else {
            showAlert('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        showAlert('Erro ao confirmar pagamento', 'error');
    }
}

async function reenviarEmailCupom(orderId) {
    if (!confirm('Reenviar cupom por email?')) return;
    
    try {
        showAlert('Enviando email...', 'info');
        
        const response = await fetch('/api/coupon-orders/resend-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Email enviado com sucesso!', 'success');
        } else {
            showAlert('Erro ao enviar email: ' + data.error, 'error');
        }
    } catch (error) {
        showAlert('Erro ao enviar email', 'error');
    }
}

async function testarEmail() {
    try {
        showAlert('Enviando email de teste...', 'info');
        
        const response = await fetch('/api/coupon-orders/test-email');
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Email de teste enviado para mg5860606@gmail.com', 'success');
        } else {
            showAlert('❌ Erro ao enviar email. Configure a senha no .env', 'error');
        }
    } catch (error) {
        showAlert('Erro ao testar email', 'error');
    }
}
