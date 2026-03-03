const { Empresa, Usuario, InstanciaWhatsapp } = require('../models');
const bcrypt = require('bcryptjs');

class EmpresaController {

  // Sin cambios ─────────────────────────────────────────────
  async obtenerEmpresa(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const empresa = await Empresa.findByPk(empresaId, {
        attributes: [
          'id', 'nombre', 'correo_contacto', 'telefono_contacto',
          'tipo_negocio', 'onboarding_completado', 'fecha_creacion' // ── NUEVO: agregar campos
        ],
        include: [
          {
            model: Usuario,
            as: 'usuarios',
            attributes: ['id', 'nombre', 'correo', 'telefono', 'verificado']
          },
          {
            model: InstanciaWhatsapp,
            as: 'instancias',
            attributes: ['id', 'nombre_sesion', 'conectado', 'ultima_conexion']
          }
        ]
      });

      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      res.status(200).json({ success: true, data: empresa });

    } catch (error) {
      console.error('Error al obtener empresa:', error);
      res.status(500).json({ success: false, message: 'Error al obtener información de la empresa' });
    }
  }

  // Sin cambios ─────────────────────────────────────────────
  async actualizarEmpresa(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;
      const { nombre, correo_contacto, telefono_contacto } = req.body;

      const empresa = await Empresa.findByPk(empresaId);

      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      if (nombre) empresa.nombre = nombre;
      if (correo_contacto !== undefined) empresa.correo_contacto = correo_contacto;
      if (telefono_contacto !== undefined) empresa.telefono_contacto = telefono_contacto;

      await empresa.save();

      res.status(200).json({
        success: true,
        message: 'Empresa actualizada correctamente',
        data: {
          id: empresa.id,
          nombre: empresa.nombre,
          correo_contacto: empresa.correo_contacto,
          telefono_contacto: empresa.telefono_contacto
        }
      });

    } catch (error) {
      console.error('Error al actualizar empresa:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar empresa' });
    }
  }

  // Sin cambios ─────────────────────────────────────────────
  async listarUsuarios(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const usuarios = await Usuario.findAll({
        where: { empresa_id: empresaId },
        attributes: ['id', 'nombre', 'correo', 'telefono', 'verificado', 'fecha_creacion']
      });

      res.status(200).json({ success: true, data: usuarios });

    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
  }

  // Sin cambios ─────────────────────────────────────────────
  async crearUsuario(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;
      const { nombre, correo, contraseña, telefono } = req.body;

      if (!nombre || !correo || !contraseña) {
        return res.status(400).json({ success: false, message: 'Nombre, correo y contraseña son obligatorios' });
      }

      const usuarioExistente = await Usuario.findOne({ where: { correo } });

      if (usuarioExistente) {
        return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
      }

      const nuevoUsuario = await Usuario.create({
        empresa_id: empresaId,
        nombre, correo, contraseña, telefono,
        verificado: true,
        token_verificacion: null
      });

      res.status(201).json({
        success: true,
        message: 'Usuario creado correctamente',
        data: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          telefono: nuevoUsuario.telefono,
          verificado: nuevoUsuario.verificado
        }
      });

    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ success: false, message: 'Error al crear usuario' });
    }
  }

  // Sin cambios ─────────────────────────────────────────────
  async actualizarUsuario(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;
      const { nombre, correo, telefono, contraseña } = req.body;

      const usuario = await Usuario.findOne({ where: { id, empresa_id: empresaId } });

      if (!usuario) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (correo && correo !== usuario.correo) {
        const correoExistente = await Usuario.findOne({ where: { correo } });
        if (correoExistente) {
          return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }
      }

      if (nombre) usuario.nombre = nombre;
      if (correo) usuario.correo = correo;
      if (telefono !== undefined) usuario.telefono = telefono;

      if (contraseña) {
        const salt = await bcrypt.genSalt(10);
        usuario.contraseña = await bcrypt.hash(contraseña, salt);
      }

      await usuario.save();

      res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, telefono: usuario.telefono }
      });

    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
  }

  // Sin cambios ─────────────────────────────────────────────
  async eliminarUsuario(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;

      if (parseInt(id) === req.usuario.id) {
        return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
      }

      const usuario = await Usuario.findOne({ where: { id, empresa_id: empresaId } });

      if (!usuario) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      await usuario.destroy();

      res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });

    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
  }

  // Sin cambios ─────────────────────────────────────────────
  async obtenerEstadisticas(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const totalUsuarios = await Usuario.count({ where: { empresa_id: empresaId } });
      const usuariosVerificados = await Usuario.count({ where: { empresa_id: empresaId, verificado: true } });
      const totalInstancias = await InstanciaWhatsapp.count({ where: { empresa_id: empresaId } });
      const instanciasConectadas = await InstanciaWhatsapp.count({ where: { empresa_id: empresaId, conectado: true } });

      res.status(200).json({
        success: true,
        data: {
          usuarios: {
            total: totalUsuarios,
            verificados: usuariosVerificados,
            pendientes: totalUsuarios - usuariosVerificados
          },
          instancias: {
            total: totalInstancias,
            conectadas: instanciasConectadas,
            desconectadas: totalInstancias - instanciasConectadas
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  }

  // ── NUEVO ─────────────────────────────────────────────────
  // PUT /api/empresas/onboarding
  // Llamado desde el componente de onboarding del frontend.
  // Guarda tipo_negocio y marca onboarding como completado.
  async actualizarOnboarding(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;
      const { tipo_negocio } = req.body;

      if (!['productos', 'servicios'].includes(tipo_negocio)) {
        return res.status(400).json({
          success: false,
          message: 'tipo_negocio debe ser "productos" o "servicios"'
        });
      }

      const empresa = await Empresa.findByPk(empresaId);

      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      empresa.tipo_negocio = tipo_negocio;
      empresa.onboarding_completado = true;
      await empresa.save();

      console.log(`✅ [ONBOARDING] Empresa ${empresaId} completó onboarding: ${tipo_negocio}`);

      res.status(200).json({
        success: true,
        message: 'Onboarding completado',
        data: {
          tipo_negocio: empresa.tipo_negocio,
          onboarding_completado: empresa.onboarding_completado
        }
      });

    } catch (error) {
      console.error('Error al actualizar onboarding:', error);
      res.status(500).json({ success: false, message: 'Error al completar onboarding' });
    }
  }

  // ── NUEVO ─────────────────────────────────────────────────
  // GET /api/empresas/onboarding
  // El guard del frontend lo llama al cargar el dashboard
  // para verificar si debe redirigir al onboarding.
  async obtenerDatosOnboarding(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const empresa = await Empresa.findByPk(empresaId, {
        attributes: ['id', 'nombre', 'tipo_negocio', 'onboarding_completado']
      });

      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      res.status(200).json({
        success: true,
        data: {
          onboarding_completado: empresa.onboarding_completado,
          tipo_negocio: empresa.tipo_negocio,
          // El frontend usa redirect para navegar si es false
          redirect: !empresa.onboarding_completado ? `/onboarding/${empresaId}` : null
        }
      });

    } catch (error) {
      console.error('Error al obtener datos de onboarding:', error);
      res.status(500).json({ success: false, message: 'Error al obtener datos de onboarding' });
    }
  }
}

module.exports = new EmpresaController();