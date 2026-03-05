// routes/chatbot.routes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { verificarToken } = require('../middleware/auth.middleware');

// ============================================
// RUTAS PUBLICAS (sin autenticacion) - Para N8N
// ============================================

// Comprobar activamente si la hora en curso recae en horario
router.get('/verificar-horario/:empresaId', chatbotController.verificarHorario);

// Ingresar un texto plano para generar un evento automatico (si tiene configuracion dada)
router.post('/analizar-mensaje/:empresaId', chatbotController.analizarMensaje);

// Inspeccionar componentes habilitados por titulo 
router.get('/catalogo/:empresaId/buscar', chatbotController.buscarEnCatalogo);

// Inspeccionar unicamente un elemento
router.get('/catalogo/:empresaId/item/:itemId', chatbotController.obtenerItemCatalogo);

// ============================================
// RUTAS PROTEGIDAS - Configuracion del Chatbot
// ============================================

// Consultar o guardar el estado horario base del operando bot
router.get('/configuracion/:empresaId', verificarToken, chatbotController.obtenerConfiguracion);
router.post('/configuracion/:empresaId', verificarToken, chatbotController.crearConfiguracion);
router.put('/configuracion/:empresaId', verificarToken, chatbotController.actualizarConfiguracion);
router.delete('/configuracion/:empresaId', verificarToken, chatbotController.eliminarConfiguracion);

// ============================================
// RUTAS PROTEGIDAS - Respuestas Automaticas
// ============================================

// Administracion de preconfiguraciones fijas orientadas a palabras clave
router.get('/respuestas/:empresaId', verificarToken, chatbotController.obtenerRespuestas);
router.post('/respuestas/:empresaId', verificarToken, chatbotController.crearRespuesta);
router.put('/respuestas/:empresaId/:respuestaId', verificarToken, chatbotController.actualizarRespuesta);
router.delete('/respuestas/:empresaId/:respuestaId', verificarToken, chatbotController.eliminarRespuesta);

module.exports = router;