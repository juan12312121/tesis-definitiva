const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const whatsappService = require('../services/whatsappService');
const { verificarToken } = require('../middleware/auth.middleware');

console.log('[RUTAS] Cargando whatsapp.routes.js...');

// ========================================
// RUTAS PUBLICAS (SIN TOKEN) - PARA N8N
// ========================================

// Crear infraestructura de baileio
router.post('/public/iniciar-sesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.body;

    console.log(`\n[RUTAS] POST /public/iniciar-sesion`);
    console.log(`   Empresa: ${empresaId}, Sesion: ${nombreSesion}`);

    if (!empresaId || !nombreSesion) {
      return res.status(400).json({
        success: false,
        error: 'empresaId y nombreSesion son requeridos'
      });
    }

    const resultado = await whatsappService.iniciarSesion(parseInt(empresaId), nombreSesion);
    res.json(resultado);
  } catch (error) {
    console.error('[RUTAS] Error iniciando sesion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Comprobar la conexion activa de baileys transitoriamente
router.get('/public/estado/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;

    console.log(`[RUTAS] GET /public/estado/${empresaId}/${nombreSesion}`);

    const estado = await whatsappService.verificarEstado(parseInt(empresaId), nombreSesion);

    res.json({
      success: true,
      empresaId,
      nombreSesion,
      ...estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[RUTAS] Error verificando estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mostrar imagen o string url para enlazar al inicio por codigo
router.get('/public/obtener-qr/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;

    console.log(`[RUTAS] GET /public/obtener-qr/${empresaId}/${nombreSesion}`);

    const resultado = whatsappService.obtenerQR(parseInt(empresaId), nombreSesion);
    res.json(resultado);
  } catch (error) {
    console.error('[RUTAS] Error obteniendo QR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rutear un archivo grafico como mensaje anidado con base 64 usual y text extra via webhook n8n
router.post('/public/enviar-imagen', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, imagenUrl, caption } = req.body;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[RUTAS] POST /public/enviar-imagen`);
    console.log(`   Empresa: ${empresaId}, Sesion: ${nombreSesion}`);
    console.log(`   Destino: ${numeroDestino}`);
    console.log(`   ImagenUrl: ${imagenUrl}`);
    console.log(`${'='.repeat(70)}`);

    if (!empresaId || !nombreSesion || !numeroDestino || !imagenUrl) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parametros requeridos'
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
    console.error('[RUTAS] Error enviando imagen:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Comunicacion por mensaje plano estandar (texto) originado desdel bot a un destino
router.post('/public/enviar-mensaje', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, mensaje } = req.body;

    console.log(`[RUTAS] POST /public/enviar-mensaje`);

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
    console.error('[RUTAS] Error enviando mensaje:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Control transitorio al terminar instancia para revocar autorizacion del bot por empresa
router.post('/public/cerrar-sesion/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;

    console.log(`[RUTAS] POST /public/cerrar-sesion/${empresaId}/${nombreSesion}`);

    const resultado = await whatsappService.cerrarSesion(parseInt(empresaId), nombreSesion);
    res.json(resultado);
  } catch (error) {
    console.error('[RUTAS] Error cerrando sesion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compatibilidad adicional delegada al bot n8n para traer todo parametro transicional (horario o de bot nativo)
router.get('/public/configuracion-chatbot', async (req, res) => {
  try {
    const { empresaId } = req.query;

    console.log(`[RUTAS] GET /public/configuracion-chatbot?empresaId=${empresaId}`);

    if (!empresaId) {
      return res.status(400).json({
        success: false,
        message: 'empresaId es requerido'
      });
    }

    await whatsappController.obtenerConfiguracionChatbot(req, res);
  } catch (error) {
    console.error('[RUTAS] Error obteniendo configuracion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disparo alterno para formatear menu en base a listados, encuestas de bot a numero
router.post('/public/enviar-respuesta-n8n', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, mensaje, botones } = req.body;

    console.log(`[RUTAS] POST /public/enviar-respuesta-n8n`);
    console.log(`   Empresa: ${empresaId}, Sesion: ${nombreSesion}`);

    if (!empresaId || !nombreSesion || !numeroDestino || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'empresaId, nombreSesion, numeroDestino y mensaje son requeridos'
      });
    }

    await whatsappController.enviarRespuestaN8N(req, res);
  } catch (error) {
    console.error('[RUTAS] Error enviando respuesta N8N:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Diagnostico general de los detalles de la conexion baileys (memoria, qr viejo, en progreso)
router.get('/public/estado-detallado/:empresaId/:nombreSesion', (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;

    console.log(`[RUTAS] GET /public/estado-detallado/${empresaId}/${nombreSesion}`);

    const estado = whatsappService.obtenerEstadoSesion(parseInt(empresaId), nombreSesion);

    res.json({
      success: true,
      empresaId,
      nombreSesion,
      ...estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[RUTAS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mostrar metricas o log de toda sesion activa general
router.get('/public/sesiones', (req, res) => {
  try {
    console.log(`[RUTAS] GET /public/sesiones`);

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
    console.error('[RUTAS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('[RUTAS] Rutas publicas de WhatsApp registradas');

// ========================================
// RUTAS PROTEGIDAS (CON TOKEN) - DASHBOARD
// ========================================

router.use(verificarToken);

// Presentacion UI
router.get('/qr', whatsappController.obtenerQR);

// UI validacion ping
router.get('/estado', whatsappController.verificarEstado);

// Formato emisor directo UI manual o de campaña al cliente
router.post('/enviar-mensaje', whatsappController.enviarMensaje);

// Metodo administrativo
router.post('/desconectar', whatsappController.desconectarInstancia);

// Purga e reinicio administrativo forzado
router.post('/reiniciar', whatsappController.reiniciarConexion);

console.log('[RUTAS] Rutas protegidas de WhatsApp registradas');

module.exports = router;