const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { verificarToken } = require('../middleware/auth.middleware');

// Rutas agrupadas para manejar la logica de productos y clasificaciones

// RUTAS PUBLICAS (sin autorizacion)
// Extrae productos listos para la visualizacion del cliente externo
router.get('/publico/:empresaId', catalogoController.obtenerCatalogoPublico);
// Listado basico de los grupos habilitados para presentacion
router.get('/publico/:empresaId/categorias', catalogoController.obtenerCategoriasPublico);

// Consultas globales de inventario que pueden provenir de modulos cruzados
router.get('/stock/bajo-todas-empresas', catalogoController.obtenerStockBajoTodasEmpresas);
router.get('/stock/bajo/:empresaId', catalogoController.obtenerStockBajoPorEmpresa);

// RUTAS PRIVADAS (requieren encabezado de autenticacion jwt)
router.use(verificarToken);

// Gestion de las clasificaciones del catalogo
router.get('/categorias', catalogoController.obtenerCategorias);
router.post('/categorias', catalogoController.agregarCategoria);
router.delete('/categorias/:id', catalogoController.eliminarCategoria);

// Consulta general y de busqueda filtrada
router.get('/estadisticas', catalogoController.obtenerEstadisticas);
router.get('/buscar', catalogoController.buscarItems);

// Operaciones centrales (CRUD) sobre productos
router.get('/', catalogoController.obtenerCatalogo);
router.post('/', catalogoController.crearItem);
router.get('/:id', catalogoController.obtenerItem);
router.put('/:id', catalogoController.actualizarItem);
router.delete('/:id', catalogoController.eliminarItem);
router.patch('/:id/stock', catalogoController.actualizarStock);

module.exports = router;