// routes/chatbot.routes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { verificarToken } = require('../middleware/auth.middleware');

// ⚠️ ============================================
// RUTAS PÚBLICAS (sin autenticación) - Para N8N
// ⚠️ ============================================

// Verificar horario de atención
router.get('/verificar-horario/:empresaId', chatbotController.verificarHorario);

// Analizar mensaje y obtener respuesta automática
router.post('/analizar-mensaje/:empresaId', chatbotController.analizarMensaje);

// Buscar en catálogo (productos/servicios)
router.get('/catalogo/:empresaId/buscar', chatbotController.buscarEnCatalogo);

// Obtener item específico del catálogo
router.get('/catalogo/:empresaId/item/:itemId', chatbotController.obtenerItemCatalogo);

// 🔒 ============================================
// RUTAS PROTEGIDAS - Configuración del Chatbot
// 🔒 ============================================

router.get('/configuracion/:empresaId', verificarToken, chatbotController.obtenerConfiguracion);
router.post('/configuracion/:empresaId', verificarToken, chatbotController.crearConfiguracion);
router.put('/configuracion/:empresaId', verificarToken, chatbotController.actualizarConfiguracion);
router.delete('/configuracion/:empresaId', verificarToken, chatbotController.eliminarConfiguracion);

// 🔒 ============================================
// RUTAS PROTEGIDAS - Respuestas Automáticas
// 🔒 ============================================

router.get('/respuestas/:empresaId', verificarToken, chatbotController.obtenerRespuestas);
router.post('/respuestas/:empresaId', verificarToken, chatbotController.crearRespuesta);
router.put('/respuestas/:empresaId/:respuestaId', verificarToken, chatbotController.actualizarRespuesta);
router.delete('/respuestas/:empresaId/:respuestaId', verificarToken, chatbotController.eliminarRespuesta);

module.exports = router;