// routes/catalogo.routes.js
// ============================================================
// RUTAS COMPLETAS DEL CATÁLOGO + STOCK BAJO
// ============================================================

const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { verificarToken } = require('../middleware/auth.middleware');

// ─────────────────────────────────────────────────────────────
// 🌐 RUTAS PÚBLICAS (sin token)
// ─────────────────────────────────────────────────────────────

// Catálogo público para clientes y chatbot
router.get('/publico/:empresaId', catalogoController.obtenerCatalogoPublico);

// 🔔 Stock bajo para n8n — SIN token (n8n lo llama internamente)
// GET /api/catalogo/stock/bajo-todas-empresas?umbral=5
router.get('/stock/bajo-todas-empresas', catalogoController.obtenerStockBajoTodasEmpresas);

// GET /api/catalogo/stock/bajo/:empresaId?umbral=5
router.get('/stock/bajo/:empresaId', catalogoController.obtenerStockBajoPorEmpresa);

// ─────────────────────────────────────────────────────────────
// 🔒 RUTAS PRIVADAS (requieren token)
// ─────────────────────────────────────────────────────────────
router.use(verificarToken);

// Utilidades
router.get('/categorias-disponibles', catalogoController.obtenerCategoriasDisponibles);
router.get('/categorias', catalogoController.obtenerCategorias);
router.post('/categorias', catalogoController.agregarCategoria);
router.get('/estadisticas', catalogoController.obtenerEstadisticas);
router.get('/buscar', catalogoController.buscarItems);

// CRUD principal
router.get('/', catalogoController.obtenerCatalogo);
router.post('/', catalogoController.crearItem);
router.get('/:id', catalogoController.obtenerItem);
router.put('/:id', catalogoController.actualizarItem);
router.delete('/:id', catalogoController.eliminarItem);

// 🔔 Actualizar stock de un producto (admin)
// PATCH /api/catalogo/:id/stock  { "stock": 20 }
router.patch('/:id/stock', catalogoController.actualizarStock);

module.exports = router;