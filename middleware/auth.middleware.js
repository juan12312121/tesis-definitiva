// middleware/auth.js (TU VERSIÓN - NO REEMPLAZAR)
// Este es tu middleware existente, no necesitas cambiarlo
// Solo asegúrate de que exporta verificarToken

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const verificarToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!usuario.verificado) {
      return res.status(403).json({
        success: false,
        message: 'Usuario no verificado'
      });
    }

    // Agregar usuario al request
    req.usuario = {
      id: usuario.id,
      empresa_id: usuario.empresa_id,
      correo: usuario.correo
    };

    next();

  } catch (error) {
    console.error('Error en autenticación:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error en la autenticación'
    });
  }
};

module.exports = { verificarToken };