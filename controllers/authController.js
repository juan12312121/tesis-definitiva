const { Empresa, Usuario, InstanciaWhatsapp } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EmailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const { sequelize } = require('../config/database');

class AuthController {

  // ========================= REGISTRO =========================
  // Funcion para registrar una nueva empresa y su primer usuario
  async registrarEmpresa(req, res) {
    console.log('[REGISTRO] Request recibido');
    console.log('[REGISTRO] Body:', req.body);

    // Iniciar transaccion para asegurar integridad de multiples registros dependientes
    const transaction = await sequelize.transaction();

    try {
      const {
        nombre_empresa,
        correo_empresa,
        telefono_empresa,
        nombre_usuario,
        correo_usuario,
        contraseña_usuario,
        telefono_usuario
      } = req.body;

      // Validar datos de entrada estrictamente requeridos
      if (!nombre_empresa || !nombre_usuario || !correo_usuario || !contraseña_usuario) {
        console.log('[REGISTRO] Faltan campos obligatorios');
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Faltan campos obligatorios'
        });
      }

      // Prevenir la creacion de multiples cuentas con el mismo correo
      const usuarioExistente = await Usuario.findOne({
        where: { correo: correo_usuario }
      });

      console.log('[REGISTRO] Usuario existente:', !!usuarioExistente);

      if (usuarioExistente) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'El correo del usuario ya esta registrado'
        });
      }

      // Crear el registro de la nueva empresa
      const nuevaEmpresa = await Empresa.create({
        nombre: nombre_empresa,
        correo_contacto: correo_empresa || null,
        telefono_contacto: telefono_empresa || null
        // tipo_negocio y onboarding_completado quedan en sus defaults (null y false)
      }, { transaction });

      console.log('[REGISTRO] Empresa creada:', nuevaEmpresa.id);

      // Crear un identificador de seguridad en forma de token
      const tokenVerificacion = crypto.randomBytes(32).toString('hex');

      // Crear componente para acceso de administracion vinculado a la empresa
      const nuevoUsuario = await Usuario.create({
        empresa_id: nuevaEmpresa.id,
        nombre: nombre_usuario,
        correo: correo_usuario,
        contraseña: contraseña_usuario,
        telefono: telefono_usuario || null,
        verificado: false,
        token_verificacion: tokenVerificacion
      }, { transaction });

      console.log('[REGISTRO] Usuario creado:', nuevoUsuario.correo);

      // Crear estructura de almacenamiento para instanciar su conexion de mensajeria
      const nombreSesion = `empresa_${nuevaEmpresa.id}`;

      const nuevaInstancia = await InstanciaWhatsapp.create({
        empresa_id: nuevaEmpresa.id,
        nombre_sesion: nombreSesion,
        conectado: false
      }, { transaction });

      console.log('[REGISTRO] Instancia WhatsApp creada:', nombreSesion);

      // Formalizar los cambios en la base de datos
      await transaction.commit();
      console.log('[REGISTRO] Transaccion confirmada');

      // Intentar montar su sesion virtual de comunicacion
      try {
        await whatsappService.iniciarSesion(nuevaEmpresa.id, nombreSesion);
        console.log('[WHATSAPP] Sesion iniciada');
      } catch (e) {
        console.warn('[WHATSAPP] Error no critico:', e.message);
      }

      // Notificar con confirmacion al correo del solicitante
      try {
        await EmailService.enviarEmailVerificacion(
          correo_usuario,
          tokenVerificacion,
          'usuario'
        );
        console.log('[EMAIL] Verificacion enviada');
      } catch (e) {
        console.warn('[EMAIL] Error:', e.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Empresa y usuario creados. Verifica tu correo.',
        data: {
          empresa: {
            id: nuevaEmpresa.id,
            nombre: nuevaEmpresa.nombre,
            // El frontend usa esto para redirigir al proceso de onboarding
            onboarding_completado: false,
            redirect_onboarding: `/onboarding/${nuevaEmpresa.id}`
          },
          usuario: {
            id: nuevoUsuario.id,
            nombre: nuevoUsuario.nombre,
            correo: nuevoUsuario.correo
          },
          whatsapp: {
            instancia_id: nuevaInstancia.id,
            nombre_sesion: nombreSesion,
            conectado: false
          }
        }
      });

    } catch (error) {
      // Devolver los cambios en caso de fallo intermedio o general
      await transaction.rollback();
      console.error('[REGISTRO] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al registrar empresa'
      });
    }
  }

  // ========================= LOGIN =========================
  // Identificar usuario desde sus credenciales y dar acceso  
  async login(req, res) {
    console.log('[LOGIN] Request recibido');
    console.log('[LOGIN] Body:', req.body);

    try {
      const { correo, contraseña } = req.body;

      if (!correo || !contraseña) {
        console.log('[LOGIN] Datos incompletos');
        return res.status(400).json({
          success: false,
          message: 'Correo y contraseña son obligatorios'
        });
      }

      // Intentar ubicarlo consultando informacion adjunta
      const usuario = await Usuario.findOne({
        where: { correo },
        include: [
          {
            model: Empresa,
            as: 'empresa',
            // Obtener parametros vitales para el front end en el onboarding
            attributes: ['id', 'nombre', 'tipo_negocio', 'onboarding_completado'],
            include: [
              {
                model: InstanciaWhatsapp,
                as: 'instancia_whatsapp'
              }
            ]
          }
        ]
      });

      console.log('[LOGIN] Usuario encontrado:', usuario ? usuario.correo : null);

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales invalidas'
        });
      }

      console.log('[LOGIN] Usuario verificado:', usuario.verificado);

      // Requerir aprobacion desde email si aun no existe
      if (!usuario.verificado) {
        return res.status(403).json({
          success: false,
          message: 'Debes verificar tu correo antes de iniciar sesion'
        });
      }

      // Validacion de criptografia
      const passwordValida = await usuario.comparePassword(contraseña);
      console.log('[LOGIN] Password valida:', passwordValida);

      if (!passwordValida) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales invalidas'
        });
      }

      // Generar autorizacion web tipo JWT con metadata basica 
      const token = jwt.sign(
        {
          id: usuario.id,
          empresa_id: usuario.empresa_id,
          correo: usuario.correo,
          tipo_negocio: usuario.empresa.tipo_negocio,
          onboarding_completado: usuario.empresa.onboarding_completado
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('[LOGIN] Login exitoso:', usuario.correo);

      return res.status(200).json({
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
            nombre: usuario.empresa.nombre,
            tipo_negocio: usuario.empresa.tipo_negocio,
            onboarding_completado: usuario.empresa.onboarding_completado
          },
          whatsapp: usuario.empresa.instancia_whatsapp || null
        }
      });

    } catch (error) {
      console.error('[LOGIN] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar sesion'
      });
    }
  }

  // ========================= VERIFICAR EMAIL =========================
  // Ruta que se consume al darle click al link en el mail
  async verificarEmail(req, res) {
    console.log('[VERIFY] Request recibido');
    console.log('[VERIFY] Token:', req.query.token);

    try {
      const { token } = req.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (!token) {
        return res.redirect(`${frontendUrl}?verificacion=error`);
      }

      // Buscar coincidencia para este identificador
      const usuario = await Usuario.findOne({
        where: { token_verificacion: token }
      });

      console.log('[VERIFY] Usuario:', usuario ? usuario.correo : null);

      if (!usuario) {
        return res.redirect(`${frontendUrl}?verificacion=error`);
      }

      // Limpiar y aprobar de forma oficial
      usuario.verificado = true;
      usuario.token_verificacion = null;
      await usuario.save();

      console.log('[VERIFY] Usuario verificado');

      return res.redirect(`${frontendUrl}?verificacion=success`);

    } catch (error) {
      console.error('[VERIFY] Error:', error);
      return res.status(500).json({ success: false });
    }
  }
}

module.exports = new AuthController();