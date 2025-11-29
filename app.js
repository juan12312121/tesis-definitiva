const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const whatsappService = require('./services/whatsappService');

// Rutas
const authRoutes = require('./routes/auth.routes');
const empresaRoutes = require('./routes/empresa.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const historialRoutes = require('./routes/historialRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const uploadRoutes = require('./routes/upload.routes'); // ← NUEVA RUTA

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/upload', uploadRoutes); // ← NUEVA RUTA

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Chatbot WhatsApp funcionando correctamente',
    version: '2.0.0',
    features: [
      '✅ WhatsApp con Baileys',
      '✅ Chatbot con IA',
      '✅ Configuración personalizable',
      '✅ Historial de mensajes',
      '✅ Respuestas automáticas',
      '✅ Subida de imágenes'
    ]
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Ruta no encontrada' 
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ 
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const iniciarServidor = async () => {
  try {
    // Probar conexión a la base de datos
    await testConnection();
    
    // Iniciar servidor
    app.listen(PORT, async () => {
      console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🤖 CHATBOT WHATSAPP API v2.0              ║
║                                              ║
║   🚀 Servidor corriendo en puerto ${PORT}      ║
║   📱 WhatsApp con Baileys integrado         ║
║   ✅ Base de datos conectada                ║
║   🧠 IA integrada (Claude API)              ║
║   ⚙️  Configuración personalizable          ║
║   💾 Historial de mensajes                  ║
║   📤 Subida de imágenes                     ║
║                                              ║
╚══════════════════════════════════════════════╝
      `);

      // Cargar sesiones guardadas
      console.log('\n🔄 Cargando sesiones de WhatsApp guardadas...\n');
      try {
        await whatsappService.cargarSesionesGuardadas();
        console.log('\n✅ Sesiones de WhatsApp cargadas correctamente\n');
      } catch (error) {
        console.error('\n❌ Error al cargar sesiones de WhatsApp:', error);
      }

      // Mostrar rutas disponibles
      console.log('📋 Rutas disponibles:');
      console.log('   AUTH:');
      console.log('   - POST   /api/auth/login');
      console.log('   - POST   /api/auth/register');
      console.log('   EMPRESA:');
      console.log('   - GET    /api/empresa');
      console.log('   WHATSAPP:');
      console.log('   - POST   /api/whatsapp/iniciar-sesion');
      console.log('   - POST   /api/whatsapp/enviar-mensaje');
      console.log('   CHATBOT:');
      console.log('   - GET    /api/chatbot/configuracion/:empresaId');
      console.log('   - POST   /api/chatbot/configuracion/:empresaId');
      console.log('   - PUT    /api/chatbot/configuracion/:empresaId');
      console.log('   - GET    /api/chatbot/verificar-horario/:empresaId');
      console.log('   HISTORIAL:');
      console.log('   - GET    /api/historial/cliente/:empresaId/:numeroCliente');
      console.log('   - GET    /api/historial/clientes/:empresaId');
      console.log('   - GET    /api/historial/estadisticas/:empresaId');
      console.log('   CATÁLOGO:');
      console.log('   - GET    /api/catalogo/:empresaId');
      console.log('   - POST   /api/catalogo/:empresaId');
      console.log('   - PUT    /api/catalogo/:empresaId/:itemId');
      console.log('   - DELETE /api/catalogo/:empresaId/:itemId');
      console.log('   UPLOAD:');
      console.log('   - POST   /api/upload/imagen');
      console.log('   - DELETE /api/upload/imagen/:filename\n');
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();