const fs = require('fs');
const path = require('path');

/**
 * Salvar senha de email no .env
 */
exports.saveEmailPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Senha não fornecida'
            });
        }

        const envPath = path.join(__dirname, '../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Verificar se EMAIL_PASSWORD já existe
        if (envContent.includes('EMAIL_PASSWORD=')) {
            // Substituir senha existente
            envContent = envContent.replace(
                /EMAIL_PASSWORD=.*/g,
                `EMAIL_PASSWORD=${password}`
            );
        } else {
            // Adicionar nova linha
            envContent += `\nEMAIL_PASSWORD=${password}\n`;
        }

        // Salvar arquivo
        fs.writeFileSync(envPath, envContent, 'utf8');

        // Atualizar variável de ambiente em tempo de execução
        process.env.EMAIL_PASSWORD = password;

        console.log('✅ Senha de email salva no .env');

        res.json({
            success: true,
            message: 'Senha configurada com sucesso! Emails prontos para envio.'
        });

    } catch (error) {
        console.error('❌ Erro ao salvar senha:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao salvar configuração'
        });
    }
};

/**
 * Verificar se email está configurado
 */
exports.checkEmailConfig = async (req, res) => {
    try {
        const configured = !!(process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD.length > 0);

        res.json({
            success: true,
            configured,
            email: process.env.EMAIL_USER || 'mg5860606@gmail.com'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
