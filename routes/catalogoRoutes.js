const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { verificarToken } = require('../middleware/auth.middleware');

// 🌐 RUTAS PÚBLICAS
router.get('/publico/:empresaId', catalogoController.obtenerCatalogoPublico);
router.get('/publico/:empresaId/categorias', catalogoController.obtenerCategoriasPublico); // ✅ NUEVO
router.get('/stock/bajo-todas-empresas', catalogoController.obtenerStockBajoTodasEmpresas);
router.get('/stock/bajo/:empresaId', catalogoController.obtenerStockBajoPorEmpresa);

// 🔒 RUTAS PRIVADAS
router.use(verificarToken);

router.get('/categorias', catalogoController.obtenerCategorias);
router.post('/categorias', catalogoController.agregarCategoria);
router.delete('/categorias/:id', catalogoController.eliminarCategoria);
router.get('/estadisticas', catalogoController.obtenerEstadisticas);
router.get('/buscar', catalogoController.buscarItems);

router.get('/', catalogoController.obtenerCatalogo);
router.post('/', catalogoController.crearItem);
router.get('/:id', catalogoController.obtenerItem);
router.put('/:id', catalogoController.actualizarItem);
router.delete('/:id', catalogoController.eliminarItem);
router.patch('/:id/stock', catalogoController.actualizarStock);

module.exports = router;