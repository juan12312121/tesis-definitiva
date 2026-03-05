const ConfiguracionChatbot = require('../models/ConfiguracionChatbot');
const RespuestaAutomatica = require('../models/RespuestaAutomatica');
const { CatalogoItem } = require('../models');
const moment = require('moment-timezone');
const { Op } = require('sequelize');

const chatbotController = {

  // Validar de forma temporal si la consulta a recepcion del robot transcurre en horario
  verificarHorario: async (req, res) => {
    try {
      const { empresaId } = req.params;

      // Intentar leer las condiciones programadas de horario en este dia
      const config = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId, activo: true }
      });

      if (!config) {
        // En ausencia de configuracion explicita, responder verdadero
        return res.json({ dentro_horario: true, mensaje: null, configuracion_existe: false });
      }

      // Definir instantes para calculo y verificacion del limite por horas
      const ahora = moment().tz('America/Mexico_City');
      const diaActual = ahora.day();
      const horaActual = ahora.format('HH:mm:ss');
      const diasLaborales = config.dias_laborales || [1, 2, 3, 4, 5];
      const esDiaLaboral = diasLaborales.includes(diaActual);

      let dentroHorario = true;
      if (config.horario_inicio && config.horario_fin && esDiaLaboral) {
        // Ejecutar calculo limitrofe en ese dia laboral
        dentroHorario = horaActual >= config.horario_inicio && horaActual <= config.horario_fin;
      }

      // Reaccionar con formato que interprete el manejador del bot 
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

  // Busqueda superficial y emparejamiento con base a texto descriptivo provisto por el usuario
  analizarMensaje: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { mensaje } = req.body;

      if (!mensaje) {
        return res.status(400).json({ error: 'Se requiere el mensaje', debe_responder: false });
      }

      // Ubicacion del registro activado para operacion
      const config = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId, activo: true }
      });

      if (!config) {
        return res.json({ debe_responder: false, razon: 'Chatbot no configurado o inactivo' });
      }

      // Normalizado a base comun usando reemplazo regular y uniformidad 
      const mensajeNormalizado = mensaje
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const respuestas = await RespuestaAutomatica.findAll({
        where: { empresa_id: empresaId },
        order: [['fecha_creacion', 'DESC']]
      });

      // Validacion y contraste secuencial de cada opcion sobre el texto provisto
      for (const respuesta of respuestas) {
        const disparadores = respuesta.texto_disparador
          .split(',')
          .map(d => d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

        // Confirmacion parcial util
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
        razon: 'No se detecto ningun disparador configurado',
        mensaje_analizado: true
      });

    } catch (error) {
      console.error('Error al analizar mensaje:', error);
      return res.status(500).json({ error: 'Error al analizar mensaje', debe_responder: false });
    }
  },

  // Utilidad externa para emparejar servicios desde los servicios N8N o de bot
  buscarEnCatalogo: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { busqueda, tipo } = req.query;
      const where = { empresa_id: empresaId };

      if (tipo && ['producto', 'servicio'].includes(tipo)) where.tipo_item = tipo;
      if (busqueda?.trim()) {
        // Clausulas parecidas para capturar por titulo parcial o cuerpo descriptivo
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busqueda.trim()}%` } },
          { descripcion: { [Op.like]: `%${busqueda.trim()}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({ where, limit: 20, order: [['nombre_item', 'ASC']] });
      return res.json({ success: true, total: items.length, items });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al buscar en catalogo' });
    }
  },

  // Consulta manual mediante paramtro general del chatbot
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

  // Recupera la lista de terminos y acciones predichas
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

  // Construccion del flujo automatizado usando palabras maestras
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

      // Validacion para descartar posibles comportamientos anormalees
      const tiposValidos = ['mostrar_productos', 'mostrar_pedidos', 'mostrar_horario', 'cancelar_pedido', 'saludo_inicial'];
      if (!tiposValidos.includes(tipo_respuesta)) {
        return res.status(400).json({
          success: false,
          message: `tipo_respuesta invalido. Validos: ${tiposValidos.join(', ')}`
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

  // Cambiar en comportamiento automatico la accion o la palabra clave de lanzamiento
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

  // Remocion del diccionario estandar
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

  // Retornar al usuario de administracion sus reglajes
  obtenerConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (!config) return res.status(404).json({ success: false, message: 'Configuracion no encontrada' });
      return res.json({ success: true, data: config });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al obtener configuracion' });
    }
  },

  // Creacion desde entorno vacio si no se hallan previas configuraciones a un id de empresa
  crearConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const existe = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (existe) return res.status(400).json({ success: false, message: 'Ya existe configuracion' });
      const nueva = await ConfiguracionChatbot.create({ empresa_id: empresaId, ...req.body });
      return res.status(201).json({ success: true, data: nueva });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al crear configuracion' });
    }
  },

  // Efectuar persistencia base en caso de configuracion preexistente
  actualizarConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (!config) return res.status(404).json({ success: false, message: 'Configuracion no encontrada' });
      await config.update(req.body);
      return res.json({ success: true, data: config });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al actualizar configuracion' });
    }
  },

  // Remocion del reglaje automatizado
  eliminarConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const config = await ConfiguracionChatbot.findOne({ where: { empresa_id: empresaId } });
      if (!config) return res.status(404).json({ success: false, message: 'Configuracion no encontrada' });
      await config.destroy();
      return res.json({ success: true, message: 'Configuracion eliminada' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error al eliminar configuracion' });
    }
  }
};

module.exports = chatbotController;