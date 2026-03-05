const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');

console.log('[RUTAS] Registrando rutas de pedidos...');

// ========================================
// TODAS LAS RUTAS SON PUBLICAS
// ========================================

// Guardar temporal (uso durante interaccion con bot de eleccion por indices)
router.post('/sesion', (req, res) => {
  console.log('\n[RUTAS] POST /api/pedidos/sesion');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.guardarSesion(req, res);
});

// Recuperacion transitoria usada a menudo en n8n
router.get('/sesion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/sesion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.obtenerSesion(req, res);
});

// Consultar todas las comandas creadas sobre ese cliente origen
router.get('/usuario/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/usuario/:empresaId/:numeroOrigen');
  console.log('   Params completos:', req.params);
  pedidoController.consultarPedidosCliente(req, res);
});

// Manipulacion requerida durante la ejecucion de la sesion
router.put('/sesion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n[RUTAS] PUT /api/pedidos/sesion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.actualizarEstadoSesion(req, res);
});

// Eliminar el cache logico
router.delete('/sesion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n[RUTAS] DELETE /api/pedidos/sesion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.limpiarSesion(req, res);
});

// Generar o cristalizar en base un pedido transaccional
router.post('/crear', (req, res) => {
  console.log('\n[RUTAS] POST /api/pedidos/crear');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.crearPedidoWhatsApp(req, res);
});

// Listado global administrativo por entidad comercial
router.get('/empresa/:empresaId', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/empresa/:empresaId');
  console.log('   Params:', req.params);
  console.log('   Query:', req.query);
  pedidoController.obtenerPedidos(req, res);
});

// Resumen del comprobante de venta o adquisicion
router.get('/detalle/:pedidoId', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/detalle/:pedidoId');
  console.log('   Params:', req.params);
  pedidoController.obtenerDetallePedido(req, res);
});

// Actualizacion manual o por disparidad del estatus
router.put('/actualizar-estado/:pedidoId', (req, res) => {
  console.log('\n[RUTAS] PUT /api/pedidos/actualizar-estado/:pedidoId');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.actualizarEstado(req, res);
});

// Indicadores transaccionales basicos
router.get('/estadisticas/:empresaId', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/estadisticas/:empresaId');
  console.log('   Params:', req.params);
  pedidoController.obtenerEstadisticas(req, res);
});

// Compatibilidad general, misma accion por dos alias
router.get('/:pedidoId', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/:pedidoId');
  console.log('   Params:', req.params);
  pedidoController.obtenerPedidoPorId(req, res);
});

router.get('/:pedidoId', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/:pedidoId');
  console.log('   Params:', req.params);
  pedidoController.obtenerDetallePedido(req, res);
});

// Control alterno para abortar una operacion transaccional
router.patch('/:pedidoId/cancelar', (req, res) => {
  console.log('\n[RUTAS] PATCH /api/pedidos/:pedidoId/cancelar');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  req.body.pedidoId = req.params.pedidoId;
  pedidoController.cancelarPedidoCliente(req, res);
});

// ========================================
// SESIONES TRANSICIONALES PARA CANCELACION
// ========================================

// Almacenamiento logico y temporal equivalente
router.post('/sesion-cancelacion', (req, res) => {
  console.log('\n[RUTAS] POST /api/pedidos/sesion-cancelacion');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.guardarSesionCancelacion(req, res);
});

// Rescate
router.get('/sesion-cancelacion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n[RUTAS] GET /api/pedidos/sesion-cancelacion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.obtenerSesionCancelacion(req, res);
});

// Borrado temporal posterior a completar cancelado de ticket de comprobacion
router.delete('/sesion-cancelacion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n[RUTAS] DELETE /api/pedidos/sesion-cancelacion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.limpiarSesionCancelacion(req, res);
});

module.exports = router;