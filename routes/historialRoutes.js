const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const { verificarToken } = require('../middleware/auth.middleware');

// RUTAS PUBLICAS (sin autenticacion) - Usadas por N8N

// Registro directo tras comunicacion por webhook
router.post('/mensaje', historialController.guardarMensaje);

// RUTAS PROTEGIDAS (requieren autenticacion)
// Para que la UI web consuma los datos de un chat especifico
router.get('/cliente/:empresaId/:numeroCliente', verificarToken, historialController.obtenerHistorialCliente);

// Obtener todas las identidades foraneas que tengan contacto vigente con esta firma 
router.get('/clientes/:empresaId', verificarToken, historialController.obtenerClientesConversaciones);

// Lista condensada basica visual inicial
router.get('/recibidos/:empresaId', verificarToken, historialController.obtenerMensajesRecibidos);
router.get('/buscar/:empresaId', verificarToken, historialController.buscarEnHistorial);
router.get('/estadisticas/:empresaId', verificarToken, historialController.obtenerEstadisticas);

module.exports = router;