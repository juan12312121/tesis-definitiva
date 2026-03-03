const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const { verificarToken } = require('../middleware/auth.middleware');

router.use(verificarToken);

// Rutas de empresa
router.get('/', empresaController.obtenerEmpresa);
router.put('/', empresaController.actualizarEmpresa);
router.get('/estadisticas', empresaController.obtenerEstadisticas);

// ── NUEVO: Onboarding ─────────────────────────────────────────
router.get('/onboarding', empresaController.obtenerDatosOnboarding);
router.put('/onboarding', empresaController.actualizarOnboarding);
// ─────────────────────────────────────────────────────────────

// Rutas de usuarios de la empresa
router.get('/usuarios', empresaController.listarUsuarios);
router.post('/usuarios', empresaController.crearUsuario);
router.put('/usuarios/:id', empresaController.actualizarUsuario);
router.delete('/usuarios/:id', empresaController.eliminarUsuario);

module.exports = router;