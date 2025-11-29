const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const { verificarToken } = require('../middleware/auth.middleware');

// ⚠️ RUTAS PÚBLICAS (sin autenticación) - Usadas por N8N
router.post('/mensaje', historialController.guardarMensaje);

// 🔒 RUTAS PROTEGIDAS (requieren autenticación)
router.get('/cliente/:empresaId/:numeroCliente', verificarToken, historialController.obtenerHistorialCliente);
router.get('/clientes/:empresaId', verificarToken, historialController.obtenerClientesConversaciones);
router.get('/recibidos/:empresaId', verificarToken, historialController.obtenerMensajesRecibidos);
router.get('/buscar/:empresaId', verificarToken, historialController.buscarEnHistorial);
router.get('/estadisticas/:empresaId', verificarToken, historialController.obtenerEstadisticas);

module.exports = router;