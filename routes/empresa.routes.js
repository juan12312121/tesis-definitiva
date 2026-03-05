const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const { verificarToken } = require('../middleware/auth.middleware');

router.use(verificarToken);

// Rutas de uso para la entidad comercial principal

// Administrar los datos del espacio de trabajo
router.get('/', empresaController.obtenerEmpresa);
router.put('/', empresaController.actualizarEmpresa);

// Resumen del conjunto total de usuarios e instancias
router.get('/estadisticas', empresaController.obtenerEstadisticas);

// Rutas guiadas correspondientes al marco de registro posterior al alta principal
router.get('/onboarding', empresaController.obtenerDatosOnboarding);
router.put('/onboarding', empresaController.actualizarOnboarding);

// Gestion cruzada de la rama "Subadmins" dentro de la misma jerarquia
router.get('/usuarios', empresaController.listarUsuarios);
router.post('/usuarios', empresaController.crearUsuario);
router.put('/usuarios/:id', empresaController.actualizarUsuario);
router.delete('/usuarios/:id', empresaController.eliminarUsuario);

module.exports = router;