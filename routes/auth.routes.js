const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas públicas
router.post('/registro', authController.registrarEmpresa);
router.get('/verificar-email', authController.verificarEmail);
router.post('/login', authController.login);

module.exports = router;
