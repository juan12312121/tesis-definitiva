const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas orientadas a autenticacion y control principal de acceso

// Inscripcion de nueva empresa administradora en la plataforma
router.post('/registro', authController.registrarEmpresa);

// Verificacion y activacion de cuenta por medio de url enviado a correo 
router.get('/verificar-email', authController.verificarEmail);

// Sesion e inicio de credenciales 
router.post('/login', authController.login);

module.exports = router;
