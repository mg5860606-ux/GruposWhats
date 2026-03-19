const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const groupsRouter = require('./routes/groups');
const paymentRouter = require('./routes/payment');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/groups', groupsRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/analytics', analyticsRouter);

// Endpoint de teste para criar pagamento demo (apenas desenvolvimento)
app.post('/api/test/create-payment-demo', async (req, res) => {
  try {
    const { db } = require('./config/firebase');
    
    const pagamento = {
      ...req.body,
      status: 'approved',
      paymentId: 'DEMO-' + Date.now(),
      preferenceId: 'PREF-' + Date.now(),
      dataCriacao: Date.now() - 3600000,
      dataAprovacao: Date.now()
    };

    const docRef = await db.collection('pagamentosHistorico').add(pagamento);
    
    res.json({ 
      success: true, 
      message: 'Pagamento demo criado!', 
      id: docRef.id 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rota principal - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Rota VIP
app.get('/vip', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vip.html'));
});

// Rotas SEO - Páginas de Categoria
app.get('/categoria/:categoria', async (req, res) => {
  const { categoria } = req.params;
  const { db } = require('./config/firebase');
  
  try {
    const snapshot = await db.collection('grupos').get();
    const grupos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.aprovado !== false && data.categoria === categoria) {
        grupos.push({ id: doc.id, ...data });
      }
    });

    const categoryNames = {
      'amizade': 'Amizade',
      'amor-romance': 'Namoro e Romance',
      'anime': 'Anime',
      'games': 'Games e Jogos',
      'tecnologia': 'Tecnologia',
      'memes': 'Memes',
      'musica': 'Música',
      'cripto': 'Criptomoedas',
      'educacao': 'Educação',
      'compra-venda': 'Compra e Venda',
      'outros': 'Outros'
    };

    const categoryName = categoryNames[categoria] || categoria;
    const html = generateCategoryPage(categoria, categoryName, grupos);
    res.send(html);
  } catch (error) {
    res.status(500).send('Erro ao carregar categoria');
  }
});

// Rotas SEO - Página Individual do Grupo
app.get('/grupo/:id', async (req, res) => {
  const { id } = req.params;
  const { db } = require('./config/firebase');
  
  try {
    const doc = await db.collection('grupos').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).send('Grupo não encontrado');
    }

    const grupo = { id: doc.id, ...doc.data() };
    const html = generateGroupPage(grupo);
    res.send(html);
  } catch (error) {
    res.status(500).send('Erro ao carregar grupo');
  }
});

// Sitemap.xml dinâmico
app.get('/sitemap.xml', async (req, res) => {
  const { db } = require('./config/firebase');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  try {
    const snapshot = await db.collection('grupos').get();
    const grupos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.aprovado !== false) {
        grupos.push({ id: doc.id, ...data });
      }
    });

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/vip</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Adicionar categorias
    const categorias = ['amizade', 'amor-romance', 'anime', 'games', 'tecnologia', 'memes', 'musica', 'cripto', 'educacao', 'compra-venda', 'outros'];
    categorias.forEach(cat => {
      sitemap += `
  <url>
    <loc>${baseUrl}/categoria/${cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    // Adicionar grupos individuais
    grupos.forEach(grupo => {
      sitemap += `
  <url>
    <loc>${baseUrl}/grupo/${grupo.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    res.status(500).send('Erro ao gerar sitemap');
  }
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const robots = `User-agent: *
Allow: /
Allow: /categoria/
Allow: /grupo/
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`;
  
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Erro interno do servidor' 
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔥 Firebase: ${process.env.FIREBASE_PROJECT_ID ? 'Configurado' : 'Aguardando configuração'}`);
  console.log(`💳 Mercado Pago: ${process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Configurado' : 'Não configurado'}`);
});

// Funções para gerar páginas SEO
function generateCategoryPage(categoria, categoryName, grupos) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const description = `Encontre os melhores grupos de WhatsApp sobre ${categoryName}. ${grupos.length} grupos disponíveis para você entrar gratuitamente!`;
  
  const gruposHtml = grupos.map(g => `
    <article itemscope itemtype="http://schema.org/Article" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 itemprop="headline" style="color: #25D366; margin-bottom: 10px; font-size: 20px;">${g.nome}</h2>
      <p itemprop="description" style="color: #666; margin-bottom: 15px;">${g.descricao}</p>
      <a href="/grupo/${g.id}" style="background: #25D366; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">Ver Grupo</a>
      <a href="${g.link}" target="_blank" rel="noopener" style="background: #128C7E; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-left: 10px;">Entrar no WhatsApp</a>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grupos de WhatsApp - ${categoryName} | GruposWhats</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="grupos whatsapp, grupos whatsapp ${categoryName.toLowerCase()}, ${categoryName.toLowerCase()} whatsapp, grupos brasil">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="Grupos de WhatsApp - ${categoryName}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${baseUrl}/categoria/${categoria}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${baseUrl}/images/og-image.jpg">
  <link rel="canonical" href="${baseUrl}/categoria/${categoria}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    header { background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 30px 20px; text-align: center; }
    main { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    h1 { margin: 0; font-size: 32px; }
    .breadcrumb { margin-top: 10px; opacity: 0.9; font-size: 14px; }
    .breadcrumb a { color: white; text-decoration: none; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Grupos de WhatsApp - ${categoryName}",
    "description": "${description}",
    "url": "${baseUrl}/categoria/${categoria}",
    "numberOfItems": ${grupos.length}
  }
  </script>
</head>
<body>
  <header>
    <h1>Grupos de WhatsApp - ${categoryName}</h1>
    <div class="breadcrumb">
      <a href="/">Início</a> / <span>Categoria: ${categoryName}</span>
    </div>
    <p>${grupos.length} grupos encontrados</p>
  </header>
  <main>
    ${grupos.length > 0 ? gruposHtml : '<p style="text-align:center;">Nenhum grupo disponível nesta categoria ainda.</p>'}
    <div style="text-align: center; margin-top: 40px;">
      <a href="/" style="background: #25D366; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block;">← Voltar para Todas as Categorias</a>
    </div>
  </main>
</body>
</html>`;
}

function generateGroupPage(grupo) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const categoryNames = {
    'amizade': 'Amizade',
    'amor-romance': 'Namoro e Romance',
    'anime': 'Anime',
    'games': 'Games e Jogos',
    'tecnologia': 'Tecnologia',
    'memes': 'Memes',
    'musica': 'Música',
    'cripto': 'Criptomoedas',
    'educacao': 'Educação',
    'compra-venda': 'Compra e Venda',
    'outros': 'Outros'
  };
  const categoryName = categoryNames[grupo.categoria] || grupo.categoria;
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${grupo.nome} - Grupo de WhatsApp | GruposWhats</title>
  <meta name="description" content="${grupo.descricao}">
  <meta name="keywords" content="grupo whatsapp, ${grupo.nome}, ${categoryName.toLowerCase()}, entrar grupo whatsapp">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${grupo.nome} - Grupo de WhatsApp">
  <meta property="og:description" content="${grupo.descricao}">
  <meta property="og:url" content="${baseUrl}/grupo/${grupo.id}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${grupo.imagem || baseUrl + '/images/og-image.jpg'}">
  <link rel="canonical" href="${baseUrl}/grupo/${grupo.id}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    header { background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 30px 20px; text-align: center; }
    main { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .group-card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .group-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }
    h1 { margin: 0 0 20px 0; color: #25D366; font-size: 28px; }
    .category-badge { background: #25D366; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 15px; }
    .description { color: #333; line-height: 1.6; margin-bottom: 20px; font-size: 16px; }
    .join-button { background: #25D366; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 18px; margin-right: 10px; }
    .back-button { background: #666; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; }
    .breadcrumb { margin-top: 10px; opacity: 0.9; font-size: 14px; }
    .breadcrumb a { color: white; text-decoration: none; }
    ${grupo.vip ? '.vip-badge { background: gold; color: #333; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-bottom: 15px; display: inline-block; }' : ''}
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${grupo.nome}",
    "description": "${grupo.descricao}",
    "url": "${baseUrl}/grupo/${grupo.id}",
    "datePublished": "${new Date(grupo.dataCriacao).toISOString()}",
    "author": {
      "@type": "Organization",
      "name": "GruposWhats"
    },
    "publisher": {
      "@type": "Organization",
      "name": "GruposWhats",
      "logo": {
        "@type": "ImageObject",
        "url": "${baseUrl}/images/logo.png"
      }
    },
    "image": "${grupo.imagem || baseUrl + '/images/og-image.jpg'}",
    "articleSection": "${categoryName}"
  }
  </script>
</head>
<body>
  <header>
    <div class="breadcrumb">
      <a href="/">Início</a> / <a href="/categoria/${grupo.categoria}">${categoryName}</a> / <span>${grupo.nome}</span>
    </div>
  </header>
  <main>
    <article class="group-card" itemscope itemtype="http://schema.org/Article">
      ${grupo.vip ? '<div class="vip-badge">⭐ GRUPO VIP</div>' : ''}
      ${grupo.imagem ? `<img src="${grupo.imagem}" alt="${grupo.nome}" class="group-image" itemprop="image">` : ''}
      <span class="category-badge">${categoryName}</span>
      <h1 itemprop="headline">${grupo.nome}</h1>
      <p class="description" itemprop="description">${grupo.descricao}</p>
      ${grupo.tags && grupo.tags.length > 0 ? `<p style="color: #666; font-size: 14px;"><strong>Tags:</strong> ${grupo.tags.map(t => '#' + t).join(', ')}</p>` : ''}
      <div style="margin-top: 30px;">
        <a href="${grupo.link}" class="join-button" target="_blank" rel="noopener">📱 Entrar no Grupo</a>
        <a href="/" class="back-button">← Voltar</a>
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>👥 ${grupo.visitas || 0} visitas</p>
        <p>📅 Publicado em ${new Date(grupo.dataCriacao).toLocaleDateString('pt-BR')}</p>
      </div>
    </article>
    <div style="margin-top: 40px; text-align: center; padding: 30px; background: white; border-radius: 12px;">
      <h2 style="color: #25D366; margin-bottom: 15px;">Quer divulgar seu grupo?</h2>
      <p style="color: #666; margin-bottom: 20px;">Cadastre gratuitamente e alcance milhares de pessoas!</p>
      <a href="/" style="background: #25D366; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block;">Cadastrar Meu Grupo</a>
    </div>
  </main>
</body>
</html>`;
}

module.exports = app;
