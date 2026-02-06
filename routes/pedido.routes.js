const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');

console.log('📋 Registrando rutas de pedidos...');

// ========================================
// 🌐 TODAS LAS RUTAS SON PÚBLICAS
// ========================================

// 💾 GUARDAR SESIÓN TEMPORAL (cuando escribe "1,2")
router.post('/sesion', (req, res) => {
  console.log('\n💾 POST /api/pedidos/sesion');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.guardarSesion(req, res);
});

// 📖 OBTENER SESIÓN ACTIVA (recuperar pedido temporal)
router.get('/sesion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n📖 GET /api/pedidos/sesion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.obtenerSesion(req, res);
});

// 📋 OBTENER PEDIDOS DE UN USUARIO (PARA WHATSAPP - VER HISTORIAL)
router.get('/usuario/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n📋 GET /api/pedidos/usuario/:empresaId/:numeroOrigen');
  console.log('   Params completos:', req.params);
  console.log('   empresaId:', req.params.empresaId);
  console.log('   numeroOrigen:', req.params.numeroOrigen);
  pedidoController.consultarPedidosCliente(req, res);
});

// 🔄 ACTUALIZAR ESTADO DE SESIÓN TEMPORAL (para confirmar cancelación)
router.put('/sesion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n🔄 PUT /api/pedidos/sesion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.actualizarEstadoSesion(req, res);
});

// 🗑️ ELIMINAR SESIÓN TEMPORAL
router.delete('/sesion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n🗑️ DELETE /api/pedidos/sesion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.limpiarSesion(req, res);
});

// 📦 CONFIRMAR PEDIDO FINAL (cuando da su nombre)
router.post('/crear', (req, res) => {
  console.log('\n📦 POST /api/pedidos/crear');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.crearPedidoWhatsApp(req, res);
});

// 📋 OBTENER TODOS LOS PEDIDOS DE UNA EMPRESA
router.get('/empresa/:empresaId', (req, res) => {
  console.log('\n📋 GET /api/pedidos/empresa/:empresaId');
  console.log('   Params:', req.params);
  console.log('   Query:', req.query);
  pedidoController.obtenerPedidos(req, res);
});

// 📄 OBTENER DETALLE DE UN PEDIDO
router.get('/detalle/:pedidoId', (req, res) => {
  console.log('\n📄 GET /api/pedidos/detalle/:pedidoId');
  console.log('   Params:', req.params);
  pedidoController.obtenerDetallePedido(req, res);
});

// 🔄 ACTUALIZAR ESTADO DEL PEDIDO
router.put('/actualizar-estado/:pedidoId', (req, res) => {
  console.log('\n🔄 PUT /api/pedidos/actualizar-estado/:pedidoId');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.actualizarEstado(req, res);
});

// 📊 OBTENER ESTADÍSTICAS DE PEDIDOS
router.get('/estadisticas/:empresaId', (req, res) => {
  console.log('\n📊 GET /api/pedidos/estadisticas/:empresaId');
  console.log('   Params:', req.params);
  pedidoController.obtenerEstadisticas(req, res);
});

// 📋 CONSULTAR PEDIDOS DEL CLIENTE (RUTA ALTERNATIVA)
router.get('/:pedidoId', (req, res) => {
  console.log('\n📦 GET /api/pedidos/:pedidoId');
  console.log('   Params:', req.params);
  pedidoController.obtenerPedidoPorId(req, res);  // ← Usar la nueva función
});

router.get('/:pedidoId', (req, res) => {
  console.log('\n📦 GET /api/pedidos/:pedidoId');
  console.log('   Params:', req.params);
  pedidoController.obtenerDetallePedido(req, res);
});

// ❌ CANCELAR PEDIDO (DESDE WHATSAPP)
router.patch('/:pedidoId/cancelar', (req, res) => {
  console.log('\n❌ PATCH /api/pedidos/:pedidoId/cancelar');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  // Agregar pedidoId al body para usar el mismo controlador
  req.body.pedidoId = req.params.pedidoId;
  pedidoController.cancelarPedidoCliente(req, res);
});

// ❌ CANCELAR PEDIDO POR ID (DESDE WHATSAPP)
router.patch('/:pedidoId/cancelar', (req, res) => {
  console.log('\n❌ PATCH /api/pedidos/:pedidoId/cancelar');
  console.log('   Params:', req.params);
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  // Agregar pedidoId al body para usar el mismo controlador
  req.body.pedidoId = req.params.pedidoId;
  pedidoController.cancelarPedidoCliente(req, res);
});

// ========================================
// 🔄 SESIONES DE CANCELACIÓN
// ========================================

// 💾 GUARDAR SESIÓN DE CANCELACIÓN
router.post('/sesion-cancelacion', (req, res) => {
  console.log('\n💾 POST /api/pedidos/sesion-cancelacion');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  pedidoController.guardarSesionCancelacion(req, res);
});

// 📖 OBTENER SESIÓN DE CANCELACIÓN
router.get('/sesion-cancelacion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n📖 GET /api/pedidos/sesion-cancelacion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.obtenerSesionCancelacion(req, res);
});

// 🗑️ ELIMINAR SESIÓN DE CANCELACIÓN
router.delete('/sesion-cancelacion/:empresaId/:numeroOrigen', (req, res) => {
  console.log('\n🗑️ DELETE /api/pedidos/sesion-cancelacion/:empresaId/:numeroOrigen');
  console.log('   Params:', req.params);
  pedidoController.limpiarSesionCancelacion(req, res);
});

console.log('✅ Rutas públicas de pedidos registradas:');
console.log('   POST   /api/pedidos/sesion                          (Guardar temporal)');
console.log('   GET    /api/pedidos/sesion/:empresaId/:numeroOrigen (Obtener temporal)');
console.log('   PUT    /api/pedidos/sesion/:empresaId/:numeroOrigen (Actualizar estado sesión)');
console.log('   DELETE /api/pedidos/sesion/:empresaId/:numeroOrigen (Limpiar temporal)');
console.log('   GET    /api/pedidos/usuario/:empresaId/:numeroOrigen (Ver historial - NUEVO)');
console.log('   POST   /api/pedidos/crear                           (Confirmar pedido)');
console.log('   GET    /api/pedidos/empresa/:empresaId              (Listar pedidos)');
console.log('   GET    /api/pedidos/detalle/:pedidoId               (Ver detalle)');
console.log('   PUT    /api/pedidos/actualizar-estado/:pedidoId     (Cambiar estado)');
console.log('   GET    /api/pedidos/estadisticas/:empresaId         (Ver stats)');
console.log('   GET    /api/pedidos/cliente/:empresaId/:telefono    (Consultar pedidos)');
console.log('   PATCH  /api/pedidos/cancelar                        (Cancelar pedido)');
console.log('   PATCH  /api/pedidos/:pedidoId/cancelar              (Cancelar por ID)');
console.log('   POST   /api/pedidos/sesion-cancelacion              (Guardar sesión cancelación)');
console.log('   GET    /api/pedidos/sesion-cancelacion/:empresaId/:numeroOrigen (Obtener sesión)');
console.log('   DELETE /api/pedidos/sesion-cancelacion/:empresaId/:numeroOrigen (Limpiar sesión)');
console.log('');
console.log('⚠️  TODAS LAS RUTAS SON PÚBLICAS - SIN AUTENTICACIÓN');

module.exports = router;