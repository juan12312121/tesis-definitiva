// controllers/chatbotController.js

const ConfiguracionChatbot = require('../models/ConfiguracionChatbot');
const RespuestaAutomatica = require('../models/RespuestaAutomatica');
const { CatalogoItem } = require('../models');
const moment = require('moment-timezone');
const { Op } = require('sequelize');

const chatbotController = {

  verificarHorario: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId, activo: true }
      });

      if (!config) {
        return res.json({ dentro_horario: true, mensaje: null, configuracion_existe: false });
      }

      const ahora = moment().tz('America/Mexico_City');
      const diaActual = ahora.day();
      const horaActual = ahora.format('HH:mm:ss');
      const diasLaborales = config.dias_laborales || [1, 2, 3, 4, 5];
      const esDiaLaboral = diasLaborales.includes(diaActual);

      let dentroHorario = true;
      if (config.horario_inicio && config.horario_fin && esDiaLaboral) {
        dentroHorario = horaActual >= config.horario_inicio && horaActual <= config.horario_fin;
      }

      return res.json({
        dentro_horario: dentroHorario,
        mensaje: dentroHorario ? config.mensaje_bienvenida : config.mensaje_fuera_horario,
        es_dia_laboral: esDiaLaboral,
        configuracion_existe: true,
        empresa_id: empresaId
      });
    } catch (error) {
      console.error('Error al verificar horario:', error);
      return res.status(500).json({ error: 'Error al verificar horario', dentro_horario: true });
    }
  },

  analizarMensaje: async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { mensaje } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: 'Se requiere el mensaje', debe_responder: false });
    }

    const config = await ConfiguracionChatbot.findOne({
      where: { empresa_id: empresaId, activo: true }
    });

    if (!config) {
      return res.json({ debe_responder: false, razon: 'Chatbot no configurado o inactivo' });
    }

    const mensajeNormalizado = mensaje
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const respuestas = await RespuestaAutomatica.findAll({
      where: { empresa_id: empresaId },
      order: [['fecha_creacion', 'DESC']]
    });

    for (const respuesta of respuestas) {
      const disparadores = respuesta.texto_disparador
        .split(',')
        .map(d => d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

      const coincide = disparadores.some(d => mensajeNormalizado.includes(d));

      if (coincide) {
        return res.json({
          debe_responder: true,
          disparador_detectado: respuesta.texto_disparador,
          mensaje_analizado: true
        });
      }
    }

    return res.json({
      debe_responder: false,
      razon: 'No se detectó ningún disparador configurado',
      mensaje_analizado: true
    });

  } catch (error) {
    console.error('Error al analizar mensaje:', error);
    return res.status(500).json({ error: 'Error al analizar mensaje', debe_responder: false });
  }
},

  buscarEnCatalogo: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { busqueda, tipo } = req.query;
      const where = { empresa_id: empresaId };

      if (tipo && ['producto', 'servicio'].includes(tipo)) where.tipo_item = tipo;
      if (busqueda?.trim()) {
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busqueda.trim()}%` } },
          { descripcion: { [Op.like]: `%${busqueda.trim()}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({ where, limit: 20, order: [['nombre_item', 'ASC']] });
      return res.json({ success: true, total: items.length, items });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al buscar en catálogo' });
    }
  },

  obtenerItemCatalogo: async (req, res) => {
    try {
      const { empresaId, itemId } = req.params;
      const item = await CatalogoItem.findOne({ where: { id: itemId, empresa_id: empresaId } });
      if (!item) return res.status(404).json({ success: false, message: 'Item no encontrado' });
      return res.json({ success: true, item });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al obtener item' });
    }
  },

  obtenerRespuestas: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const respuestas = await RespuestaAutomatica.findAll({
        where: { empresa_id: empresaId },
        order: [['fecha_creacion', 'DESC']]
      });
      return res.json({ success: true, data: respuestas });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al obtener respuestas' });
    }
  },

  crearRespuesta: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { texto_disparador, tipo_respuesta } = req.body;

      if (!texto_disparador || !tipo_respuesta) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere texto_disparador y tipo_respuesta'
        });
      }

      const tiposValidos = ['mostrar_productos', 'mostrar_pedidos', 'mostrar_horario', 'cancelar_pedido', 'saludo_inicial'];
      if (!tiposValidos.includes(tipo_respuesta)) {
        return res.status(400).json({
          success: false,
          message: `tipo_respuesta inválido. Válidos: ${tiposValidos.join(', ')}`
        });
      }

      const disparadorNormalizado = texto_disparador.toLowerCase().trim();

      const existente = await RespuestaAutomatica.findOne({
        where: { empresa_id: empresaId, texto_disparador: disparadorNormalizado }
      });

      if (existente) {
        return res.status(400).json({ success: false, message: 'Ya existe una respuesta con ese disparador' });
      }

      const nuevaRespuesta = await RespuestaAutomatica.create({
        empresa_id: empresaId,
        texto_disparador: disparadorNormalizado,
        tipo_respuesta: tipo_respuesta
      });

      return res.status(201).json({ success: true, data: nuevaRespuesta });
    } catch (error) {
      console.error('Error al crear respuesta:', error);
      return res.status(500).json({ success: false, message: 'Error al crear respuesta' });
    }
  },

  actualizarRespuesta: async (req, res) => {
    try {
      const { empresaId, respuestaId } = req.params;
      const respuesta = await RespuestaAutomatica.findOne({
        where: { id: respuestaId, empresa_id: empresaId }
      });
      if (!respuesta) return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
      await respuesta.update(req.body);
      return res.json({ success: true, data: respuesta });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al actualizar respuesta' });
    }
  },

  eliminarRespuesta: async (req, res) => {
    try {
      const { empresaId, respuestaId } = req.params;
      const respuesta = await RespuestaAutomatica.findOne({
        where: { id: respuestaId, empresa_id: empresaId }
      });
      if (!respuesta) return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
      await respuesta.destroy();
      return res.json({ success: true, message: 'Respuesta eliminada' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al eliminar respuesta' });
    }
  },

  obtenerConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (!config) return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
      return res.json({ success: true, data: config });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al obtener configuración' });
    }
  },

  crearConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const existe = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (existe) return res.status(400).json({ success: false, message: 'Ya existe configuración' });
      const nueva = await ConfiguracionChatbot.create({ empresa_id: empresaId, ...req.body });
      return res.status(201).json({ success: true, data: nueva });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al crear configuración' });
    }
  },

  actualizarConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (!config) return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
      await config.update(req.body);
      return res.json({ success: true, data: config });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
    }
  },

  eliminarConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (!config) return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
      await config.destroy();
      return res.json({ success: true, message: 'Configuración eliminada' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al eliminar configuración' });
    }
  }
};

module.exports = chatbotController;