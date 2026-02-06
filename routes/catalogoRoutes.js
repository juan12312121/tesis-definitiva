const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { verificarToken } = require('../middleware/auth.middleware');

router.get('/publico/:empresaId', catalogoController.obtenerCatalogoPublico);

router.use(verificarToken);

router.get('/categorias-disponibles', catalogoController.obtenerCategoriasDisponibles);
router.get('/categorias', catalogoController.obtenerCategorias);
router.post('/categorias', catalogoController.agregarCategoria);

router.get('/estadisticas', catalogoController.obtenerEstadisticas);
router.get('/buscar', catalogoController.buscarItems);

router.get('/', catalogoController.obtenerCatalogo);
router.post('/', catalogoController.crearItem);
router.get('/:id', catalogoController.obtenerItem);
router.put('/:id', catalogoController.actualizarItem);
router.delete('/:id', catalogoController.eliminarItem);

module.exports = router;