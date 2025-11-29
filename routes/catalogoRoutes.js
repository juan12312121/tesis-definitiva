// routes/catalogoRoutes.js
const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { verificarToken } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas principales
router.get('/', catalogoController.obtenerCatalogo);
router.get('/estadisticas', catalogoController.obtenerEstadisticas);
router.get('/buscar', catalogoController.buscarItems);
router.get('/:id', catalogoController.obtenerItem);
router.post('/', catalogoController.crearItem);
router.put('/:id', catalogoController.actualizarItem);
router.delete('/:id', catalogoController.eliminarItem);

module.exports = router;