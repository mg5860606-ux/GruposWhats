// ===== CONFIGURAÇÕES =====
// ===== ANALYTICS - Tracking de Visitas =====
(function() {
    // Registrar visita ao carregar a página
    if (!sessionStorage.getItem('visitTracked')) {
        apiCall('/api/analytics/visit', {
            method: 'POST'
        }).then(() => {
            sessionStorage.setItem('visitTracked', 'true');
        }).catch(() => {
            // Ignorar erro silenciosamente
        });
    }
})();


const API_BASE_URL = window.location.origin;
const ADMIN_PASSWORD = 'gasole96';
const MERCADOPAGO_PUBLIC_KEY = 'APP_USR-61db44b5-fa4d-4fcb-8482-1db693f326e2';

// ===== DADOS =====
let grupos = [];
let gruposPendentes = [];
let meusGrupos = JSON.parse(localStorage.getItem('meusGrupos')) || [];
let currentFilter = 'todos';
let isAdminLoggedIn = false;
let selectedPackageHours = 12;
let selectedPackagePrice = 9.90;
let currentBoostGroupId = null;

// Paginação
let currentPage = 1;
const GROUPS_PER_PAGE = 36;

// Pacotes de impulsionamento
const BOOST_PACKAGES = {
    12: { hours: 12, price: 4.95, name: '12 Horas' },
    24: { hours: 24, price: 9.90, name: '24 Horas' },
    72: { hours: 72, price: 29.70, name: '3 Dias' },
    168: { hours: 168, price: 69.30, name: '7 Dias' }
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    checkVipFromURL();
    loadGroups();
    setInterval(verificarGruposExpirados, 60000);
});

// ===== API CALLS =====
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        return { success: false, error: error.message };
    }
}

// Carregar grupos do backend
async function loadGroups() {
    const response = await apiCall('/api/groups');
    if (response.success) {
        grupos = response.grupos || [];
        renderAll();
    }
}

// Carregar grupos pendentes (Admin)
async function loadPendingGroups() {
    const response = await apiCall('/api/groups/pending');
    if (response.success) {
        gruposPendentes = response.grupos || [];
        renderPendingGroups();
    }
}

// ===== VERIFICAR VIP DA URL =====
async function checkVipFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const vipGroupId = urlParams.get('vip');
    const status = urlParams.get('status');
    
    if (vipGroupId && status === 'approved') {
        // Buscar dados do pagamento pendente
        const paymentData = JSON.parse(localStorage.getItem('pendingPayment_' + vipGroupId) || '{}');
        const hours = paymentData.hours || 12;
        
        // Ativar VIP via API
        const response = await apiCall('/api/payment/activate-vip', {
            method: 'POST',
            body: JSON.stringify({ groupId: vipGroupId, hours })
        });
        
        if (response.success) {
            localStorage.removeItem('pendingPayment_' + vipGroupId);
            showAlert(`✅ Pagamento confirmado! Seu grupo agora é VIP por ${hours} horas!`, 'success');
            await loadGroups();
        }
        
        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ===== TEMA =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    const sidebarToggle = document.getElementById('sidebarThemeToggle');
    if (sidebarToggle) {
        sidebarToggle.checked = savedTheme === 'dark';
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    const sidebarToggle = document.getElementById('sidebarThemeToggle');
    if (sidebarToggle) {
        sidebarToggle.checked = newTheme === 'dark';
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ===== VERIFICAR GRUPOS EXPIRADOS =====
function verificarGruposExpirados() {
    const now = Date.now();
    grupos = grupos.map(grupo => {
        if (grupo.vip && grupo.vipExpira && grupo.vipExpira < now) {
            grupo.vip = false;
            grupo.vipExpira = null;
        }
        return grupo;
    });
}

// ===== NOME DA CATEGORIA =====
function getCategoryName(cat) {
    const names = {
        'amizade': 'AMIZADE',
        'amor-romance': 'NAMORO',
        'anime': 'ANIME',
        'games': 'GAMES',
        'tecnologia': 'TECNOLOGIA',
        'memes': 'MEMES',
        'musica': 'MÚSICA',
        'cripto': 'CRIPTO',
        'educacao': 'EDUCAÇÃO',
        'compra-venda': 'COMPRAS',
        'outros': 'OUTROS'
    };
    return names[cat] || 'OUTROS';
}

// ===== RENDERIZAR =====
function renderAll() {
    renderTrendingGroups();
    renderGroups();
    renderRanking();
}

function renderTrendingGroups() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;
    
    const vipGroups = grupos.filter(g => g.vip).sort((a, b) => b.dataCriacao - a.dataCriacao);
    
    if (vipGroups.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Nenhum grupo em destaque no momento.</p>';
        return;
    }
    
    grid.innerHTML = vipGroups.map(grupo => createGroupCard(grupo)).join('');
}

function renderGroups() {
    const grid = document.getElementById('groupsGrid');
    const noResults = document.getElementById('noResults');
    
    if (!grid) return;
    
    let filteredGroups = [...grupos];
    
    if (currentFilter !== 'todos') {
        filteredGroups = filteredGroups.filter(g => g.categoria === currentFilter);
    }
    
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    if (searchTerm) {
        filteredGroups = filteredGroups.filter(g => 
            g.nome.toLowerCase().includes(searchTerm) || 
            g.descricao.toLowerCase().includes(searchTerm) ||
            (g.tags && g.tags.some(t => t.toLowerCase().includes(searchTerm)))
        );
    }
    
    if (filteredGroups.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        renderPagination(0);
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    const sortedGroups = [...filteredGroups].sort((a, b) => {
        if (a.vip && !b.vip) return -1;
        if (!a.vip && b.vip) return 1;
        return b.dataCriacao - a.dataCriacao;
    });
    
    // Paginação
    const totalPages = Math.ceil(sortedGroups.length / GROUPS_PER_PAGE);
    const startIndex = (currentPage - 1) * GROUPS_PER_PAGE;
    const endIndex = startIndex + GROUPS_PER_PAGE;
    const paginatedGroups = sortedGroups.slice(startIndex, endIndex);
    
    grid.innerHTML = paginatedGroups.map(grupo => createGroupCard(grupo)).join('');
    renderPagination(totalPages);
    
    // Scroll para o topo ao mudar de página
    if (currentPage > 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHtml = '<div class="pagination">';
    
    // Botão Anterior
    if (currentPage > 1) {
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" data-testid="prev-page">
            <i class="fas fa-chevron-left"></i> Anterior
        </button>`;
    }
    
    // Páginas numeradas
    const maxButtons = 5; // Máximo de botões de página visíveis
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // Primeira página
    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-dots">...</span>`;
        }
    }
    
    // Páginas do meio
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            onclick="goToPage(${i})" data-testid="page-${i}">
            ${i}
        </button>`;
    }
    
    // Última página
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-dots">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Botão Próximo
    if (currentPage < totalPages) {
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" data-testid="next-page">
            Próximo <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    paginationHtml += '</div>';
    
    // Informação de grupos exibidos
    const startItem = (currentPage - 1) * GROUPS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * GROUPS_PER_PAGE, grupos.length);
    const totalItems = grupos.length;
    
    paginationHtml += `<div class="pagination-info">
        Mostrando ${startItem}-${endItem} de ${totalItems} grupos
    </div>`;
    
    paginationContainer.innerHTML = paginationHtml;
}

function goToPage(page) {
    currentPage = page;
    renderGroups();
}

function createGroupCard(grupo) {
    const tagsHtml = grupo.tags && grupo.tags.length > 0 
        ? `<div class="group-tags">${grupo.tags.slice(0, 3).map(t => `<span class="group-tag">#${t}</span>`).join('')}</div>`
        : '';
    
    return `
        <article class="group-card ${grupo.vip ? 'vip' : ''}" data-testid="group-card-${grupo.id}">
            <div class="group-image-wrapper">
                <img src="${grupo.imagem || 'https://via.placeholder.com/400x200?text=Grupo+WhatsApp'}" 
                     alt="Grupo ${grupo.nome}" 
                     class="group-image" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x200?text=Grupo+WhatsApp'">
                ${grupo.vip ? '<div class="vip-badge" data-testid="vip-badge"><i class="fas fa-star"></i></div>' : ''}
                <div class="category-badge-on-image">${getCategoryName(grupo.categoria)}</div>
            </div>
            <div class="group-content">
                <h3 class="group-title">${grupo.nome}</h3>
                <p class="group-desc">${grupo.descricao}</p>
                ${tagsHtml}
                <div class="group-actions">
                    <button class="btn-join" onclick="joinGroup('${grupo.link}', '${grupo.id}')" data-testid="join-btn-${grupo.id}">
                        <i class="fab fa-whatsapp"></i> Entrar
                    </button>
                    <button class="btn-share" onclick="shareGroup('${grupo.id}')" title="Compartilhar" data-testid="share-btn-${grupo.id}">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="btn-details" onclick="openGroupDetail('${grupo.id}')" title="Ver detalhes" data-testid="details-btn-${grupo.id}">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderRanking() {
    const section = document.getElementById('rankingSection');
    const grid = document.getElementById('rankingGrid');
    
    if (!section || !grid) return;
    
    const topGroups = [...grupos]
        .filter(g => g.visitas && g.visitas > 0)
        .sort((a, b) => b.visitas - a.visitas)
        .slice(0, 3);
    
    if (topGroups.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    grid.innerHTML = topGroups.map((grupo, index) => `
        <div class="ranking-item" onclick="openGroupDetail('${grupo.id}')" data-testid="ranking-${index + 1}">
            <div class="ranking-position">#${index + 1}</div>
            <img src="${grupo.imagem || 'https://via.placeholder.com/60x60'}" 
                 alt="${grupo.nome}" 
                 class="ranking-image"
                 loading="lazy">
            <div class="ranking-info">
                <h4>${grupo.nome}</h4>
                <p>${getCategoryName(grupo.categoria)}</p>
                <div class="ranking-visits"><i class="fas fa-eye"></i> ${grupo.visitas} visitas</div>
            </div>
        </div>
    `).join('');
}

// ===== ENTRAR NO GRUPO =====
async function joinGroup(link, groupId) {
    await apiCall(`/api/groups/${groupId}/visit`, { method: 'POST' });
    window.open(link, '_blank');
}

// ===== COMPARTILHAR =====
function shareGroup(groupId) {
    const grupo = grupos.find(g => g.id === groupId);
    if (!grupo) return;
    
    const text = `Confira este grupo de WhatsApp: ${grupo.nome}\n${grupo.descricao}\n\nEntre agora: `;
    const url = window.location.href;
    
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + url)}`;
    window.open(whatsappUrl, '_blank');
}

// ===== DETALHES DO GRUPO =====
function openGroupDetail(groupId) {
    const grupo = grupos.find(g => g.id === groupId);
    if (!grupo) return;
    
    const modal = document.getElementById('groupDetailModal');
    const content = document.getElementById('groupDetailContent');
    
    const relatedGroups = grupos
        .filter(g => g.id !== groupId && g.categoria === grupo.categoria)
        .slice(0, 4);
    
    const relatedHtml = relatedGroups.length > 0 ? `
        <div class="related-groups">
            <h4><i class="fas fa-link"></i> Grupos Relacionados</h4>
            <div class="related-grid">
                ${relatedGroups.map(g => `
                    <div class="related-item" onclick="openGroupDetail('${g.id}')">
                        <img src="${g.imagem || 'https://via.placeholder.com/50x50'}" alt="${g.nome}">
                        <div class="related-item-info">
                            <h5>${g.nome}</h5>
                            <span>${getCategoryName(g.categoria)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const tagsHtml = grupo.tags && grupo.tags.length > 0 
        ? `<div class="group-detail-tags">${grupo.tags.map(t => `<span class="group-tag">#${t}</span>`).join('')}</div>`
        : '';
    
    content.innerHTML = `
        <div class="group-detail-header">
            <img src="${grupo.imagem || 'https://via.placeholder.com/600x200'}" alt="${grupo.nome}" class="group-detail-image">
        </div>
        <div class="group-detail-info">
            <h3>${grupo.nome} ${grupo.vip ? '<i class="fas fa-star" style="color: var(--gold);"></i>' : ''}</h3>
            <span class="group-detail-category">${getCategoryName(grupo.categoria)}</span>
            <p class="group-detail-desc">${grupo.descricao}</p>
            ${tagsHtml}
        </div>
        <div class="group-detail-actions">
            <button class="btn-join-large" onclick="joinGroup('${grupo.link}', '${grupo.id}')">
                <i class="fab fa-whatsapp"></i> Entrar no Grupo
            </button>
        </div>
        ${relatedHtml}
    `;
    
    modal.classList.add('active');
}

function closeGroupDetailModal() {
    document.getElementById('groupDetailModal').classList.remove('active');
}

// ===== FILTRAR =====
function filterByCategory(category) {
    currentFilter = category;
    currentPage = 1; // Reset para primeira página ao filtrar
    
    document.querySelectorAll('.category-card').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    renderGroups();
}

function searchGroups() {
    currentPage = 1; // Reset para primeira página ao buscar
    renderGroups();
}

// ===== MENU =====
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// ===== MODAL ADICIONAR GRUPO =====
function openAddGroupModal() {
    document.getElementById('addGroupModal').classList.add('active');
}

function closeAddGroupModal() {
    document.getElementById('addGroupModal').classList.remove('active');
    document.getElementById('addGroupForm').reset();
    // Limpar preview da imagem se existir
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.style.display = 'none';
        preview.src = '';
    }
}

// Preview da imagem ao selecionar
function previewImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            let preview = document.getElementById('imagePreview');
            if (!preview) {
                // Criar elemento de preview se não existir
                preview = document.createElement('img');
                preview.id = 'imagePreview';
                preview.style.cssText = 'width: 100%; max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 10px; display: block;';
                input.parentNode.appendChild(preview);
            }
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            // Mostrar informações do arquivo
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            console.log(`Imagem selecionada: ${file.name}, Tamanho: ${sizeInMB}MB, Tipo: ${file.type}`);
        };
        
        reader.readAsDataURL(file);
    }
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        // Remover limite de tamanho - aceitar qualquer imagem
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Redimensionar proporcionalmente para otimizar
                const maxSize = 1200; // Aumentado para aceitar imagens maiores
                
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Melhorar qualidade da imagem
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Tentar diferentes qualidades até conseguir um tamanho aceitável
                let quality = 0.9;
                let result = canvas.toDataURL('image/jpeg', quality);
                
                // Se a imagem ainda for muito grande, reduzir qualidade gradualmente
                while (result.length > 500000 && quality > 0.3) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }
                
                console.log(`Imagem processada: ${width}x${height}, qualidade: ${quality.toFixed(1)}, tamanho: ${(result.length / 1024).toFixed(0)}KB`);
                resolve(result);
            };
            img.onerror = () => reject('Erro ao processar imagem. Tente outra imagem.');
            img.src = e.target.result;
        };
        reader.onerror = () => reject('Erro ao ler arquivo de imagem.');
        reader.readAsDataURL(file);
    });
}

async function addGroup(event) {
    event.preventDefault();
    
    const nome = document.getElementById('groupName').value.trim();
    const categoria = document.getElementById('groupCategory').value;
    const descricao = document.getElementById('groupDesc').value.trim();
    const link = document.getElementById('groupLink').value.trim();
    const imageFile = document.getElementById('groupImage').files[0];
    const tagsInput = document.getElementById('groupTags').value.trim();
    
    const rule1 = document.getElementById('rule1').checked;
    const rule2 = document.getElementById('rule2').checked;
    const rule3 = document.getElementById('rule3').checked;
    const rule4 = document.getElementById('rule4').checked;
    const rule5 = document.getElementById('rule5').checked;
    const rule6 = document.getElementById('rule6').checked;
    
    // Validar link do WhatsApp (grupos e canais)
    const isValidWhatsAppLink = link.includes('chat.whatsapp.com') || 
                                 link.includes('whatsapp.com/channel/') ||
                                 link.includes('wa.me/');
    
    if (!isValidWhatsAppLink) {
        showAlert('Por favor, insira um link válido do WhatsApp (grupo ou canal)!', 'error');
        return;
    }
    
    if (!rule1 || !rule2 || !rule3 || !rule4 || !rule5 || !rule6) {
        showAlert('Você precisa aceitar todas as regras!', 'error');
        return;
    }
    
    if (!imageFile) {
        showAlert('Por favor, selecione uma imagem!', 'error');
        return;
    }
    
    // Validar tipo de arquivo
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!validImageTypes.includes(imageFile.type)) {
        showAlert('Formato de imagem não suportado. Use: JPG, PNG, GIF, WebP ou BMP', 'error');
        return;
    }
    
    try {
        showAlert('📸 Processando imagem...', 'success');
        const imageBase64 = await convertImageToBase64(imageFile);
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
        
        showAlert('📤 Enviando grupo...', 'success');
        
        const response = await apiCall('/api/groups', {
            method: 'POST',
            body: JSON.stringify({
                nome,
                descricao,
                categoria,
                link,
                imagem: imageBase64,
                tags
            })
        });
        
        if (response.success) {
            meusGrupos.push(response.groupId);
            localStorage.setItem('meusGrupos', JSON.stringify(meusGrupos));
            closeAddGroupModal();
            showAlert('✅ Grupo enviado! Aguarde aprovação do administrador.', 'success');
        } else {
            showAlert(response.error || 'Erro ao enviar grupo', 'error');
        }
    } catch (error) {
        showAlert('❌ ' + error, 'error');
    }
}

// ===== MEUS GRUPOS =====
function openMyGroupsModal() {
    const modal = document.getElementById('myGroupsModal');
    const list = document.getElementById('myGroupsList');
    
    const meusgroupsData = grupos.filter(g => meusGrupos.includes(g.id));
    
    if (meusgroupsData.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Você ainda não adicionou nenhum grupo.</p>';
    } else {
        list.innerHTML = meusgroupsData.map(grupo => {
            const vipStatus = grupo.vip 
                ? `<p class="vip-status"><i class="fas fa-star"></i> VIP ativo - expira em ${formatTimeRemaining(grupo.vipExpira)}</p>` 
                : '';
            
            return `
                <div class="my-group-card" data-testid="my-group-${grupo.id}">
                    <div class="my-group-image">
                        <img src="${grupo.imagem}" alt="${grupo.nome}">
                        ${grupo.vip ? '<div class="vip-badge"><i class="fas fa-star"></i> VIP</div>' : ''}
                    </div>
                    <div class="my-group-content">
                        <div class="my-group-category">${getCategoryName(grupo.categoria)}</div>
                        <h4 class="my-group-title">${grupo.nome}</h4>
                        <p class="my-group-description">${grupo.descricao}</p>
                        ${vipStatus}
                    </div>
                    <div class="my-group-actions-row">
                        ${!grupo.vip ? `
                            <button class="btn-boost-free" onclick="impulsionarGratis('${grupo.id}')" data-testid="boost-free-btn-${grupo.id}">
                                <i class="fas fa-gift"></i> Impulsionamento Grátis
                            </button>
                            <button class="btn-super-vip" onclick="openBoostModalForGroup('${grupo.id}')" data-testid="boost-vip-btn-${grupo.id}">
                                <i class="fas fa-star"></i> SUPER VIP
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
}

function closeMyGroupsModal() {
    document.getElementById('myGroupsModal').classList.remove('active');
}

function formatTimeRemaining(timestamp) {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff <= 0) return 'expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days} dia(s)`;
    }
    
    return `${hours}h ${minutes}m`;
}

async function deleteMyGroup(id) {
    if (confirm('Tem certeza que deseja excluir este grupo?')) {
        const response = await apiCall(`/api/groups/${id}`, { method: 'DELETE' });
        
        if (response.success) {
            meusGrupos = meusGrupos.filter(gid => gid !== id);
            localStorage.setItem('meusGrupos', JSON.stringify(meusGrupos));
            await loadGroups();
            openMyGroupsModal();
            showAlert('Grupo excluído com sucesso!', 'success');
        } else {
            showAlert(response.error || 'Erro ao excluir grupo', 'error');
        }
    }
}

// ===== IMPULSIONAMENTO GRÁTIS (2 HORAS) =====
async function impulsionarGratis(groupId) {
    // Verifica se já foi usado recentemente
    const lastBoost = localStorage.getItem(`lastFreeBoost_${groupId}`);
    if (lastBoost) {
        const timeDiff = Date.now() - parseInt(lastBoost);
        const twoHours = 2 * 60 * 60 * 1000;
        
        if (timeDiff < twoHours) {
            const remaining = Math.ceil((twoHours - timeDiff) / (60 * 1000)); // minutos restantes
            showAlert(`⏰ Você poderá impulsionar gratuitamente novamente em ${remaining} minutos`, 'warning');
            return;
        }
    }
    
    // Ativa VIP grátis por 2 horas
    try {
        const response = await apiCall('/api/payment/activate-vip', {
            method: 'POST',
            body: JSON.stringify({
                groupId: groupId,
                hours: 2
            })
        });
        
        if (response.success) {
            // Salva o timestamp do boost grátis
            localStorage.setItem(`lastFreeBoost_${groupId}`, Date.now().toString());
            
            await loadGroups();
            closeMyGroupsModal();
            showAlert('🎉 Grupo impulsionado gratuitamente por 2 horas!', 'success');
        } else {
            showAlert(response.error || 'Erro ao impulsionar grupo', 'error');
        }
    } catch (error) {


// ===== COMPRAR CUPONS =====
function comprarCupom(tipo, quantidade, preco) {
    showAlert(`🎫 Funcionalidade de compra de cupons em breve! Pacote: ${tipo.toUpperCase()} - ${quantidade} impulsionamentos por R$ ${preco.toFixed(2)}`, 'info');
    // TODO: Integrar com sistema de pagamento
}

        showAlert('Erro ao impulsionar grupo', 'error');
    }
}


// ===== IMPULSIONAMENTO =====
function openBoostModalForGroup(groupId) {
    currentBoostGroupId = groupId;
    closeMyGroupsModal();
    document.getElementById('boostGroupId').value = groupId;
    document.getElementById('boostModal').classList.add('active');
    
    document.querySelectorAll('.package-card').forEach(card => {
        card.style.transform = '';
        card.style.boxShadow = '';
    });
}

function closeBoostModal() {
    document.getElementById('boostModal').classList.remove('active');
    document.getElementById('boostForm').reset();
    currentBoostGroupId = null;
}

function selectBoostPackage(hours, price) {
    selectedPackageHours = hours;
    selectedPackagePrice = price;
    
    document.querySelectorAll('.package-card').forEach(card => {
        card.style.transform = '';
        card.style.boxShadow = '';
    });
    
    const selectedCard = document.querySelector(`.package-card[data-hours="${hours}"]`);
    if (selectedCard) {
        selectedCard.style.transform = 'scale(1.02)';
        selectedCard.style.boxShadow = '0 0 20px var(--primary)';
    }
}

// Máscaras
document.addEventListener('DOMContentLoaded', function() {
    const cpfInput = document.getElementById('boostCpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            }
        });
    }
    
    const telInput = document.getElementById('boostTelefone');
    if (telInput) {
        telInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            }
        });
    }
});

async function payWithPix() {
    await processPayment('pix');
}

async function payWithCard() {
    await processPayment('card');
}

async function processPayment(metodoPagamento) {
    const nome = document.getElementById('boostNome').value.trim();
    const cpf = document.getElementById('boostCpf').value.trim();
    const email = document.getElementById('boostEmail').value.trim();
    const telefone = document.getElementById('boostTelefone').value.trim();
    
    if (!nome || !cpf || !email || !telefone) {
        showAlert('Preencha todos os campos!', 'error');
        return;
    }
    
    if (!currentBoostGroupId) {
        showAlert('Selecione um grupo!', 'error');
        return;
    }
    
    showAlert('🔄 Processando pagamento...', 'success');
    
    // Salvar dados do pagamento pendente
    localStorage.setItem('pendingPayment_' + currentBoostGroupId, JSON.stringify({
        hours: selectedPackageHours,
        price: selectedPackagePrice,
        timestamp: Date.now()
    }));
    
    const response = await apiCall('/api/payment/create-preference', {
        method: 'POST',
        body: JSON.stringify({
            groupId: currentBoostGroupId,
            hours: selectedPackageHours,
            price: selectedPackagePrice,
            nome,
            cpf,
            email,
            telefone,
            metodoPagamento
        })
    });
    
    if (response.success && response.initPoint) {
        showAlert('✅ Redirecionando para pagamento...', 'success');
        setTimeout(() => {
            window.location.href = response.initPoint;
        }, 1500);
    } else {
        showAlert(response.error || 'Erro ao processar pagamento', 'error');
    }
}

// ===== ATIVAR CUPOM =====
async function activateCodeFromBoost(event) {
    event.preventDefault();
    
    const codigo = document.getElementById('boostCodeInput').value.trim().toUpperCase();
    const groupId = currentBoostGroupId;
    
    if (!groupId) {
        showAlert('Erro ao identificar o grupo!', 'error');
        return;
    }
    
    const response = await apiCall('/api/groups/vip/activate-code', {
        method: 'POST',
        body: JSON.stringify({ groupId, code: codigo })
    });
    
    if (response.success) {
        document.getElementById('codeFormBoost').reset();
        closeBoostModal();
        await loadGroups();
        showAlert(`✅ ${response.message}`, 'success');
    } else {
        showAlert(response.error || 'Código inválido', 'error');
    }
}

// ===== LOJA =====
function openStoreModal() {
    document.getElementById('storeModal').classList.add('active');
}

function closeStoreModal() {
    document.getElementById('storeModal').classList.remove('active');
}

// ===== ADMIN =====
function openAdminPanel() {
    document.getElementById('adminModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
    document.getElementById('adminLoginSection').style.display = 'block';
    document.getElementById('adminPanelSection').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    isAdminLoggedIn = false;
}

async function loginAdmin(event) {
    event.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    
    const response = await apiCall('/api/groups/admin/verify', {
        method: 'POST',
        body: JSON.stringify({ password })
    });
    
    if (response.success) {
        isAdminLoggedIn = true;
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminPanelSection').style.display = 'block';
        await loadPendingGroups();
        showAlert('Login realizado com sucesso!', 'success');
    } else {
        showAlert('Senha incorreta!', 'error');
    }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
    
    if (tab === 'pending') {
        document.querySelector('[onclick="switchAdminTab(\'pending\')"]').classList.add('active');
        document.getElementById('adminPendingTab').style.display = 'block';
        loadPendingGroups();
    } else if (tab === 'payments') {
        document.querySelector('[onclick="switchAdminTab(\'payments\')"]').classList.add('active');
        document.getElementById('adminPaymentsTab').style.display = 'block';
        renderPaymentsHistory();
    } else if (tab === 'codes') {
        document.querySelector('[onclick="switchAdminTab(\'codes\')"]').classList.add('active');
        document.getElementById('adminCodesTab').style.display = 'block';
    } else {
        document.querySelector('[onclick="switchAdminTab(\'manage\')"]').classList.add('active');
        document.getElementById('adminManageTab').style.display = 'block';
        renderAdminGroups();
    }
}

function renderPendingGroups() {
    const list = document.getElementById('pendingGroupsList');
    if (!list) return;
    
    if (gruposPendentes.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum grupo pendente de aprovação.</p>';
        return;
    }
    
    list.innerHTML = gruposPendentes.map(g => `
        <div class="admin-group-item" style="flex-direction: column; align-items: stretch;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <h4>${g.nome}</h4>
                    <span>${getCategoryName(g.categoria)}</span>
                </div>
            </div>
            <img src="${g.imagem}" alt="${g.nome}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${g.descricao}</p>
            <div style="display: flex; gap: 8px;">
                <button class="btn-submit" style="flex: 1; padding: 10px;" onclick="approveGroup('${g.id}')">
                    <i class="fas fa-check"></i> Aprovar
                </button>
                <button class="btn-admin-delete" onclick="rejectGroup('${g.id}')">
                    <i class="fas fa-times"></i> Rejeitar
                </button>
            </div>
        </div>
    `).join('');
}

async function approveGroup(id) {
    const response = await apiCall(`/api/groups/${id}/approve`, { method: 'POST' });
    
    if (response.success) {
        await loadPendingGroups();
        await loadGroups();
        showAlert('Grupo aprovado com sucesso!', 'success');
    } else {
        showAlert(response.error || 'Erro ao aprovar grupo', 'error');
    }
}

async function rejectGroup(id) {
    if (confirm('Tem certeza que deseja rejeitar este grupo?')) {
        const response = await apiCall(`/api/groups/${id}/reject`, { method: 'DELETE' });
        
        if (response.success) {
            await loadPendingGroups();
            showAlert('Grupo rejeitado!', 'success');
        } else {
            showAlert(response.error || 'Erro ao rejeitar grupo', 'error');
        }
    }
}

async function renderPaymentsHistory() {
    const list = document.getElementById('paymentsHistoryList');
    if (!list) return;
    
    const response = await apiCall('/api/payment/history');
    
    if (!response.success || response.pagamentos.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum pagamento registrado.</p>';
        return;
    }
    
    list.innerHTML = response.pagamentos.map(p => {
        const data = new Date(p.dataAprovacao).toLocaleString('pt-BR');
        return `
        <div class="admin-group-item" style="flex-direction: column; align-items: stretch; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <h4 style="color: var(--primary);">${p.grupoNome}</h4>
                    <span style="font-size: 12px; color: var(--text-muted);">${data}</span>
                </div>
                <span style="background: var(--primary); color: white; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px;">
                    R$ ${p.valor.toFixed(2)}
                </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-primary); padding: 16px; border-radius: 10px;">
                <div>
                    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">NOME</p>
                    <p style="font-size: 13px; color: var(--text-primary); font-weight: 600;">${p.nome}</p>
                </div>
                <div>
                    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">CPF</p>
                    <p style="font-size: 13px; color: var(--text-primary); font-weight: 600;">${p.cpf}</p>
                </div>
                <div>
                    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">PLANO</p>
                    <p style="font-size: 13px; color: var(--primary); font-weight: 600;">${p.plano}</p>
                </div>
                <div>
                    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">PAGAMENTO</p>
                    <p style="font-size: 13px; color: var(--text-primary); font-weight: 600;">${p.metodoPagamento}</p>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function renderAdminGroups() {
    const list = document.getElementById('adminGroupsList');
    if (!list) return;
    
    if (grupos.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum grupo cadastrado.</p>';
        return;
    }
    
    list.innerHTML = grupos.map(g => `
        <div class="admin-group-item">
            <div>
                <h4>${g.nome} ${g.vip ? '<i class="fas fa-star" style="color: var(--gold);"></i>' : ''}</h4>
                <span>${getCategoryName(g.categoria)}</span>
            </div>
            <button class="btn-admin-delete" onclick="adminDeleteGroup('${g.id}')">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `).join('');
}

async function adminDeleteGroup(id) {
    if (confirm('Tem certeza que deseja excluir este grupo?')) {
        const response = await apiCall(`/api/groups/${id}`, { method: 'DELETE' });
        
        if (response.success) {
            await loadGroups();
            renderAdminGroups();
            showAlert('Grupo excluído!', 'success');
        } else {
            showAlert(response.error || 'Erro ao excluir grupo', 'error');
        }
    }
}

async function generateCodes() {
    const quantity = parseInt(document.getElementById('codeQuantity').value) || 5;
    const duration = parseInt(document.getElementById('couponDuration').value) || 12;
    
    if (quantity < 1 || quantity > 100) {
        showAlert('Quantidade deve ser entre 1 e 100', 'error');
        return;
    }
    
    const response = await apiCall('/api/groups/admin/coupons/generate', {
        method: 'POST',
        body: JSON.stringify({ quantity, hours: duration })
    });
    
    if (response.success) {
        const codesList = document.getElementById('codesList');
        const section = document.getElementById('generatedCodesSection');
        
        codesList.innerHTML = response.cupons.join('<br>');
        section.style.display = 'block';
        
        window.generatedCodesList = response.cupons;
        
        showAlert(`✅ ${response.message}`, 'success');
    } else {
        showAlert(response.error || 'Erro ao gerar cupons', 'error');
    }
}

function copyAllCodes() {
    if (!window.generatedCodesList || window.generatedCodesList.length === 0) {
        showAlert('Nenhum código para copiar!', 'error');
        return;
    }
    
    const codesText = window.generatedCodesList.join('\n');
    
    navigator.clipboard.writeText(codesText).then(() => {
        showAlert('Códigos copiados!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = codesText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showAlert('Códigos copiados!', 'success');
    });
}

function sendCodesEmail() {
    if (!window.generatedCodesList || window.generatedCodesList.length === 0) {
        showAlert('Nenhum código para enviar!', 'error');
        return;
    }
    
    const codesText = window.generatedCodesList.join('\n');
    const subject = 'Cupons de Impulsionamento - GruposWhats';
    const body = `Olá!\n\nAqui estão seus cupons de impulsionamento:\n\n${codesText}\n\nPara usar, acesse o site, vá em "Meus Grupos", clique em "Impulsionar" e insira o código.\n\nAproveite!`;
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}

// ===== ALERTA =====
function showAlert(message, type) {
    const existing = document.querySelector('.alert');
    if (existing) existing.remove();
    
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    alert.setAttribute('data-testid', `alert-${type}`);
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3500);
}


// ===== MODAL VIP =====
let grupoAtualVIP = null;
let cupomAplicado = null;
const PLANOS = {
    12: { preco: 4.95, nome: '12 Horas' },
    24: { preco: 9.90, nome: '24 Horas' },
    72: { preco: 29.70, nome: '3 Dias' },
    168: { preco: 69.30, nome: '7 Dias' }
};

// Inicializar SDK Mercado Pago
const mp = new MercadoPago('APP_USR-756df5b8-3e62-4160-b469-9f2969dae8a6', {
    locale: 'pt-BR'
});

function openBoostModalForGroup(grupoId) {
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
    document.querySelector('.metodos-pagamento').style.display = 'flex';
    cupomAplicado = null;
    document.getElementById('codigo-cupom-vip').value = '';
    document.getElementById('cupom-status').innerHTML = '';
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
    if (!codigo) {
        showAlert('Digite um código de cupom', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            cupomAplicado = data.cupom;
            document.getElementById('cupom-status').innerHTML = `<span style="color: green;">✅ Cupom aplicado: ${data.cupom.desconto}${data.cupom.tipo === 'percentual' ? '%' : 'R$'} de desconto</span>`;
            atualizarTotal();
            showAlert('Cupom aplicado com sucesso!', 'success');
        } else {
            document.getElementById('cupom-status').innerHTML = `<span style="color: red;">❌ ${data.error}</span>`;
            showAlert(data.error, 'error');
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
            
            showAlert('PIX gerado! Escaneie o QR Code', 'success');
            
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
                    loadMyGroupsPage();
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
                email: 'email@exemplo.com',
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
                loadMyGroupsPage();
            }, 2000);
        } else {
            showAlert('❌ Pagamento não aprovado: ' + (data.statusDetail || data.error), 'error');
        }
    } catch (error) {
        showAlert('Erro ao processar cartão: ' + error.message, 'error');
    }
}
