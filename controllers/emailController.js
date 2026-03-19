const nodemailer = require('nodemailer');

// Configurar transportador de email (usando Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'mg5860606@gmail.com',
        pass: process.env.EMAIL_PASSWORD || '' // Senha de app do Gmail
    }
});

// Email do administrador
const ADMIN_EMAIL = 'mg5860606@gmail.com';

/**
 * Enviar notificação para admin sobre grupo pendente
 */
exports.notifyAdminNewGroup = async (grupoData) => {
    try {
        const mailOptions = {
            from: 'GruposWhats <noreply@gruposwhats.app>',
            to: ADMIN_EMAIL,
            subject: '🔔 Novo Grupo Pendente de Aprovação',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #25D366;">🔔 Novo Grupo Aguardando Aprovação</h2>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">📋 Informações do Grupo:</h3>
                        <p><strong>Nome:</strong> ${grupoData.nome}</p>
                        <p><strong>Descrição:</strong> ${grupoData.descricao}</p>
                        <p><strong>Categoria:</strong> ${grupoData.categoria}</p>
                        <p><strong>Proprietário:</strong> ${grupoData.proprietario}</p>
                        <p><strong>Email:</strong> ${grupoData.email}</p>
                        <p><strong>Data:</strong> ${new Date(grupoData.dataCriacao).toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <p>
                        <a href="https://gruposwhats-site.onrender.com/admin.html" 
                           style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Ir para Painel Admin
                        </a>
                    </p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Esta é uma notificação automática do sistema GruposWhats.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado para admin sobre grupo pendente');
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao enviar email para admin:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Enviar cupom por email após compra
 */
exports.sendCouponEmail = async (compradorData, cupomData) => {
    try {
        const mailOptions = {
            from: 'GruposWhats <noreply@gruposwhats.app>',
            to: compradorData.email,
            subject: '🎫 Seu Cupom de Impulsionamento - GruposWhats',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">🎉 Seu Cupom Chegou!</h1>
                    </div>
                    
                    <div style="padding: 30px; background: white; border: 1px solid #ddd; border-top: none;">
                        <h2 style="color: #25D366;">Obrigado pela sua compra!</h2>
                        
                        <p>Olá <strong>${compradorData.nome}</strong>,</p>
                        
                        <p>Seu pacote de cupons está pronto para uso! 🚀</p>
                        
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                            <h3 style="margin-top: 0; color: #1e293b;">📦 Detalhes da Compra</h3>
                            <p style="font-size: 18px;"><strong>Pacote:</strong> ${cupomData.tipo}</p>
                            <p style="font-size: 18px;"><strong>Quantidade:</strong> ${cupomData.quantidade} impulsionamentos</p>
                            <p style="font-size: 24px; color: #25D366; font-weight: bold; margin: 20px 0;">
                                Código: ${cupomData.codigo}
                            </p>
                            <p style="color: #666;">💎 Sem prazo de validade</p>
                        </div>
                        
                        <div style="background: #E8F5E9; padding: 15px; border-left: 4px solid #25D366; margin: 20px 0;">
                            <h4 style="margin-top: 0;">Como usar seu cupom:</h4>
                            <ol style="margin: 10px 0; padding-left: 20px;">
                                <li>Acesse <strong>Meus Grupos</strong></li>
                                <li>Clique em <strong>SUPER VIP</strong> no grupo desejado</li>
                                <li>Digite o código: <strong>${cupomData.codigo}</strong></li>
                                <li>Aproveite o desconto!</li>
                            </ol>
                        </div>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="https://gruposwhats-site.onrender.com/meus-grupos.html" 
                               style="background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                                Ir para Meus Grupos
                            </a>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            Dúvidas? Entre em contato conosco!<br>
                            Email: suporte@gruposwhats.app
                        </p>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                        <p style="color: #666; font-size: 12px; margin: 0;">
                            © 2026 GruposWhats. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Cupom enviado por email para:', compradorData.email);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao enviar cupom por email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Enviar email de teste (para configurar senha)
 */
exports.testEmail = async (req, res) => {
    try {
        await transporter.sendMail({
            from: 'GruposWhats <noreply@gruposwhats.app>',
            to: ADMIN_EMAIL,
            subject: 'Teste de Configuração de Email',
            html: '<h1>✅ Email configurado com sucesso!</h1><p>O sistema de notificações está funcionando.</p>'
        });

        res.json({ success: true, message: 'Email de teste enviado!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
