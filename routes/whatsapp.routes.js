const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const whatsappService = require('../services/whatsappService');
const { verificarToken } = require('../middleware/auth.middleware');

console.log('📋 Cargando whatsapp.routes.js...');

// ========================================
// 🌐 RUTAS PÚBLICAS (SIN TOKEN) - PARA N8N
// ========================================

// 🚀 INICIAR SESIÓN
router.post('/public/iniciar-sesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.body;
    
    console.log(`\n🚀 POST /public/iniciar-sesion`);
    console.log(`   Empresa: ${empresaId}, Sesión: ${nombreSesion}`);
    
    if (!empresaId || !nombreSesion) {
      return res.status(400).json({
        success: false,
        error: 'empresaId y nombreSesion son requeridos'
      });
    }

    const resultado = await whatsappService.iniciarSesion(parseInt(empresaId), nombreSesion);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error iniciando sesión:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ VERIFICAR ESTADO
router.get('/public/estado/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;
    
    console.log(`✅ GET /public/estado/${empresaId}/${nombreSesion}`);
    
    const estado = await whatsappService.verificarEstado(parseInt(empresaId), nombreSesion);
    
    res.json({
      success: true,
      empresaId,
      nombreSesion,
      ...estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📱 OBTENER QR
router.get('/public/obtener-qr/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;
    
    console.log(`📱 GET /public/obtener-qr/${empresaId}/${nombreSesion}`);
    
    const resultado = whatsappService.obtenerQR(parseInt(empresaId), nombreSesion);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error obteniendo QR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Enviar imagen con caption
router.post('/public/enviar-imagen', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, imagenUrl, caption } = req.body;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📸 POST /public/enviar-imagen`);
    console.log(`   Empresa: ${empresaId}, Sesión: ${nombreSesion}`);
    console.log(`   Destino: ${numeroDestino}`);
    console.log(`   ImagenUrl: ${imagenUrl}`);
    console.log(`${'='.repeat(70)}`);

    if (!empresaId || !nombreSesion || !numeroDestino || !imagenUrl) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos'
      });
    }

    const resultado = await whatsappService.enviarImagen(
      empresaId,
      nombreSesion,
      numeroDestino,
      imagenUrl,
      caption || ''
    );

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error enviando imagen:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 📤 ENVIAR MENSAJE
router.post('/public/enviar-mensaje', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, mensaje } = req.body;
    
    console.log(`📤 POST /public/enviar-mensaje`);
    
    if (!empresaId || !nombreSesion || !numeroDestino || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'empresaId, nombreSesion, numeroDestino y mensaje son requeridos'
      });
    }

    const resultado = await whatsappService.enviarMensaje(
      parseInt(empresaId), 
      nombreSesion, 
      numeroDestino, 
      mensaje
    );
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔒 CERRAR SESIÓN
router.post('/public/cerrar-sesion/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;
    
    console.log(`🔒 POST /public/cerrar-sesion/${empresaId}/${nombreSesion}`);
    
    const resultado = await whatsappService.cerrarSesion(parseInt(empresaId), nombreSesion);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error cerrando sesión:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📋 CONFIGURACIÓN CHATBOT (PÚBLICO PARA N8N)
router.get('/public/configuracion-chatbot', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    console.log(`📋 GET /public/configuracion-chatbot?empresaId=${empresaId}`);
    
    if (!empresaId) {
      return res.status(400).json({
        success: false,
        message: 'empresaId es requerido'
      });
    }

    // Llamar al método del controlador
    await whatsappController.obtenerConfiguracionChatbot(req, res);
  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📤 ENVIAR RESPUESTA N8N (PÚBLICO)
router.post('/public/enviar-respuesta-n8n', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, mensaje, botones } = req.body;
    
    console.log(`📤 POST /public/enviar-respuesta-n8n`);
    console.log(`   Empresa: ${empresaId}, Sesión: ${nombreSesion}`);
    
    if (!empresaId || !nombreSesion || !numeroDestino || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'empresaId, nombreSesion, numeroDestino y mensaje son requeridos'
      });
    }

    // Llamar al método del controlador
    await whatsappController.enviarRespuestaN8N(req, res);
  } catch (error) {
    console.error('❌ Error enviando respuesta N8N:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 ESTADO DETALLADO
router.get('/public/estado-detallado/:empresaId/:nombreSesion', (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;
    
    console.log(`📊 GET /public/estado-detallado/${empresaId}/${nombreSesion}`);
    
    const estado = whatsappService.obtenerEstadoSesion(parseInt(empresaId), nombreSesion);
    
    res.json({
      success: true,
      empresaId,
      nombreSesion,
      ...estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📋 LISTAR SESIONES
router.get('/public/sesiones', (req, res) => {
  try {
    console.log(`📋 GET /public/sesiones`);
    
    const sesiones = [];
    for (const [key, sock] of whatsappService.sessions.entries()) {
      sesiones.push({
        sessionKey: key,
        conectado: sock && sock.user ? true : false,
        usuario: sock?.user?.id || null,
        nombre: sock?.user?.name || null
      });
    }
    
    res.json({
      success: true,
      sesiones,
      total: sesiones.length
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✅ Rutas públicas de WhatsApp registradas');

// ========================================
// 🔒 RUTAS PROTEGIDAS (CON TOKEN) - DASHBOARD
// ========================================

router.use(verificarToken);

// Obtener QR (protegido)
router.get('/qr', whatsappController.obtenerQR);

// Verificar estado (protegido)
router.get('/estado', whatsappController.verificarEstado);

// Enviar mensaje (protegido)
router.post('/enviar-mensaje', whatsappController.enviarMensaje);

// Desconectar (protegido)
router.post('/desconectar', whatsappController.desconectarInstancia);

// Reiniciar conexión (protegido)
router.post('/reiniciar', whatsappController.reiniciarConexion);

console.log('✅ Rutas protegidas de WhatsApp registradas');

module.exports = router;