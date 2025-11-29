const { Empresa, Usuario, InstanciaWhatsapp } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EmailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const { sequelize } = require('../config/database');

class AuthController {
  
  // Registro de empresa + usuario admin + instancia WhatsApp
  async registrarEmpresa(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        nombre_empresa,
        correo_empresa,        // Opcional, solo informativo
        telefono_empresa,
        nombre_usuario,
        correo_usuario,        // ESTE es el que se verifica
        contraseña_usuario,
        telefono_usuario
      } = req.body;

      // Validar campos requeridos
      if (!nombre_empresa || !nombre_usuario || !correo_usuario || !contraseña_usuario) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Faltan campos obligatorios'
        });
      }

      // Verificar si el correo del usuario ya existe
      const usuarioExistente = await Usuario.findOne({
        where: { correo: correo_usuario }
      });

      if (usuarioExistente) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'El correo del usuario ya está registrado'
        });
      }

      // 1️⃣ Crear empresa (sin verificación)
      const nuevaEmpresa = await Empresa.create({
        nombre: nombre_empresa,
        correo_contacto: correo_empresa || null,
        telefono_contacto: telefono_empresa || null
      }, { transaction });

      console.log(`✅ Empresa creada: ${nuevaEmpresa.nombre} (ID: ${nuevaEmpresa.id})`);

      // 2️⃣ Generar token de verificación para el usuario
      const tokenVerificacion = crypto.randomBytes(32).toString('hex');

      // 3️⃣ Crear usuario admin
      const nuevoUsuario = await Usuario.create({
        empresa_id: nuevaEmpresa.id,
        nombre: nombre_usuario,
        correo: correo_usuario,
        contraseña: contraseña_usuario,
        telefono: telefono_usuario || null,
        verificado: false,
        token_verificacion: tokenVerificacion
      }, { transaction });

      console.log(`✅ Usuario admin creado: ${nuevoUsuario.correo}`);

      // 4️⃣ ✅ CREAR INSTANCIA DE WHATSAPP CON NOMBRE ÚNICO BASADO EN EL ID
      const nombreSesion = `empresa_${nuevaEmpresa.id}`;
      
      const nuevaInstancia = await InstanciaWhatsapp.create({
        empresa_id: nuevaEmpresa.id,
        nombre_sesion: nombreSesion,
        conectado: false
      }, { transaction });

      console.log(`✅ Instancia WhatsApp creada: ${nombreSesion} para empresa ${nuevaEmpresa.id}`);

      // Confirmar transacción
      await transaction.commit();

      // 5️⃣ INICIAR SESIÓN DE WHATSAPP (genera QR) - DESPUÉS del commit
      console.log(`🔄 Iniciando sesión de WhatsApp para ${nombreSesion}...`);
      try {
        await whatsappService.iniciarSesion(nuevaEmpresa.id, nombreSesion);
        console.log(`✅ Sesión WhatsApp iniciada para ${nombreSesion}`);
      } catch (whatsappError) {
        console.error(`⚠️ Error al iniciar WhatsApp (no crítico):`, whatsappError.message);
        // No fallar el registro si WhatsApp falla
      }

      // 6️⃣ Enviar email de verificación solo al usuario
      try {
        await EmailService.enviarEmailVerificacion(
          correo_usuario,
          tokenVerificacion,
          'usuario'
        );
        console.log(`📧 Email de verificación enviado a ${correo_usuario}`);
      } catch (emailError) {
        console.error(`⚠️ Error al enviar email:`, emailError.message);
        // No fallar el registro si el email falla
      }

      res.status(201).json({
        success: true,
        message: 'Empresa y usuario creados. Verifica tu correo para activar tu cuenta.',
        data: {
          empresa: {
            id: nuevaEmpresa.id,
            nombre: nuevaEmpresa.nombre
          },
          usuario: {
            id: nuevoUsuario.id,
            nombre: nuevoUsuario.nombre,
            correo: nuevoUsuario.correo
          },
          whatsapp: {
            instancia_id: nuevaInstancia.id,
            nombre_sesion: nombreSesion,
            conectado: false,
            mensaje: 'Instancia creada. Después de verificar tu email, podrás conectar WhatsApp.'
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar empresa',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { correo, contraseña } = req.body;

      if (!correo || !contraseña) {
        return res.status(400).json({
          success: false,
          message: 'Correo y contraseña son obligatorios'
        });
      }

      // Buscar usuario con empresa e instancia de WhatsApp
      const usuario = await Usuario.findOne({
        where: { correo },
        include: [
          {
            model: Empresa,
            as: 'empresa',
            include: [
              {
                model: InstanciaWhatsapp,
                as: 'instancia_whatsapp',
                attributes: ['id', 'nombre_sesion', 'conectado', 'ultima_conexion']
              }
            ]
          }
        ]
      });

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está verificado
      if (!usuario.verificado) {
        return res.status(403).json({
          success: false,
          message: 'Debes verificar tu correo antes de iniciar sesión'
        });
      }

      // Verificar contraseña
      const passwordValida = await usuario.comparePassword(contraseña);
      if (!passwordValida) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        { 
          id: usuario.id,
          empresa_id: usuario.empresa_id,
          correo: usuario.correo
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          empresa_id: usuario.empresa_id,
          empresa: {
            id: usuario.empresa.id,
            nombre: usuario.empresa.nombre
          },
          whatsapp: usuario.empresa.instancia_whatsapp ? {
            conectado: usuario.empresa.instancia_whatsapp.conectado,
            ultima_conexion: usuario.empresa.instancia_whatsapp.ultima_conexion,
            necesita_configuracion: !usuario.empresa.instancia_whatsapp.conectado
          } : null
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión'
      });
    }
  }

  // Verificar email (solo para usuarios)
  async verificarEmail(req, res) {
    try {
      const { token } = req.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (!token) {
        return res.redirect(`${frontendUrl}?verificacion=error&mensaje=Token no proporcionado`);
      }

      // Buscar usuario por token
      const usuario = await Usuario.findOne({
        where: { token_verificacion: token }
      });

      if (!usuario) {
        return res.redirect(`${frontendUrl}?verificacion=error&mensaje=Token inválido o expirado`);
      }

      if (usuario.verificado) {
        return res.redirect(`${frontendUrl}?verificacion=info&mensaje=Esta cuenta ya fue verificada anteriormente`);
      }

      // Verificar usuario
      usuario.verificado = true;
      usuario.token_verificacion = null;
      await usuario.save();

      // Enviar correo de bienvenida
      try {
        await EmailService.enviarEmailBienvenida(
          usuario.correo,
          usuario.nombre
        );
      } catch (emailError) {
        console.error('Error enviando email de bienvenida:', emailError);
      }

      // Redirigir con éxito
      return res.redirect(`${frontendUrl}?verificacion=success&mensaje=Cuenta verificada exitosamente. Ya puedes iniciar sesión.`);

    } catch (error) {
      console.error('Error en verificación:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}?verificacion=error&mensaje=Error al verificar cuenta`);
    }
  }

  // Obtener perfil del usuario autenticado
  async obtenerPerfil(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.usuario.id, {
        attributes: ['id', 'nombre', 'correo', 'telefono', 'empresa_id', 'verificado'],
        include: [
          {
            model: Empresa,
            as: 'empresa',
            attributes: ['id', 'nombre', 'correo_contacto', 'telefono_contacto'],
            include: [
              {
                model: InstanciaWhatsapp,
                as: 'instancia_whatsapp',
                attributes: ['id', 'nombre_sesion', 'conectado', 'ultima_conexion']
              }
            ]
          }
        ]
      });

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: usuario
      });

    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener perfil'
      });
    }
  }

  // Reenviar email de verificación
  async reenviarVerificacion(req, res) {
    try {
      const { correo } = req.body;

      const usuario = await Usuario.findOne({
        where: { correo }
      });

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (usuario.verificado) {
        return res.status(400).json({
          success: false,
          message: 'Esta cuenta ya está verificada'
        });
      }

      // Generar nuevo token
      const nuevoToken = crypto.randomBytes(32).toString('hex');
      usuario.token_verificacion = nuevoToken;
      await usuario.save();

      // Reenviar email
      await EmailService.enviarEmailVerificacion(
        correo,
        nuevoToken,
        'usuario'
      );

      res.status(200).json({
        success: true,
        message: 'Email de verificación reenviado'
      });

    } catch (error) {
      console.error('Error al reenviar verificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reenviar email'
      });
    }
  }
}

module.exports = new AuthController();