const admin = require('firebase-admin');
require('dotenv').config();

let db;

try {
  // Verifica se as credenciais Firebase estão configuradas
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL) {
    console.warn('⚠️  Credenciais Firebase não configuradas. Usando modo mock.');
    
    // Mock do Firestore para desenvolvimento
    db = {
      collection: (name) => ({
        get: async () => ({ forEach: () => {}, docs: [] }),
        add: async (data) => ({ id: 'mock-' + Date.now() }),
        doc: (id) => ({
          get: async () => ({ exists: false, data: () => null }),
          set: async () => ({}),
          update: async () => ({}),
          delete: async () => ({})
        })
      })
    };
  } else {
    // Configuração real do Firebase
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    console.log('✅ Firebase Admin SDK inicializado com sucesso');
  }
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error.message);
  
  // Fallback para mock em caso de erro
  db = {
    collection: (name) => ({
      get: async () => ({ forEach: () => {}, docs: [] }),
      add: async (data) => ({ id: 'mock-' + Date.now() }),
      doc: (id) => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => ({}),
        update: async () => ({}),
        delete: async () => ({})
      })
    })
  };
}

module.exports = { db, admin };
