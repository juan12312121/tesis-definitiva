const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth.middleware');

// Rutas públicas
router.post('/registro', authController.registrarEmpresa);
router.get('/verificar-email', authController.verificarEmail);
router.post('/login', authController.login);

// Rutas protegidas
router.get('/perfil', verificarToken, authController.obtenerPerfil);

module.exports = router;