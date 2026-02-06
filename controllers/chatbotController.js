// controllers/chatbotController.js - MEJORADO CON PRIORIDAD PARA N8N

const ConfiguracionChatbot = require('../models/ConfiguracionChatbot');
const RespuestaAutomatica = require('../models/RespuestaAutomatica');
const { CatalogoItem } = require('../models');
const moment = require('moment-timezone');
const { Op } = require('sequelize');

const chatbotController = {
  
  // ✅ Verificar horario (sin cambios)
  verificarHorario: async (req, res) => {
    try {
      const { empresaId } = req.params;
      
      const config = await ConfiguracionChatbot.findOne({
        where: { 
          empresa_id: empresaId,
          activo: true 
        }
      });

      if (!config) {
        return res.json({
          dentro_horario: true,
          mensaje: null,
          configuracion_existe: false
        });
      }

      const ahora = moment().tz('America/Mexico_City');
      const diaActual = ahora.day();
      const horaActual = ahora.format('HH:mm:ss');

      const diasLaborales = config.dias_laborales || [1, 2, 3, 4, 5];
      const esDiaLaboral = diasLaborales.includes(diaActual);

      let dentroHorario = true;
      if (config.horario_inicio && config.horario_fin && esDiaLaboral) {
        dentroHorario = horaActual >= config.horario_inicio && 
                       horaActual <= config.horario_fin;
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
      return res.status(500).json({
        error: 'Error al verificar horario',
        dentro_horario: true,
        configuracion_existe: false
      });
    }
  },

  // 🆕 ANALIZAR MENSAJE MEJORADO - CON PRIORIDADES
  analizarMensaje: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { mensaje } = req.body;

      if (!mensaje) {
        return res.status(400).json({
          error: 'Se requiere el mensaje',
          debe_responder: false
        });
      }

      // Verificar que el chatbot esté activo
      const config = await ConfiguracionChatbot.findOne({
        where: { 
          empresa_id: empresaId,
          activo: true 
        }
      });

      if (!config) {
        return res.json({
          debe_responder: false,
          razon: 'Chatbot no configurado o inactivo',
          respuesta: null
        });
      }

      // Normalizar mensaje
      const mensajeNormalizado = mensaje
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      // 🔥 PRIORIDAD 0: COMANDOS RESERVADOS PARA N8N (NO responder aquí)
      const comandosReservados = [
        /^cancelar$/i,                              // cancelar
        /^cancelar\s+pedido\s*#?\d+$/i,            // cancelar pedido #5
        /^\d+,\d+(;\d+,\d+)*$/,                    // 1,2 o 1,2;3,1 (formato pedido)
        /^(mis\s+)?pedidos?$/i,                    // pedidos / mis pedidos
        /^historial$/i,                            // historial
        /^(si|sí|no)$/i                            // respuestas de confirmación
      ];

      const esComandoReservado = comandosReservados.some(patron => patron.test(mensajeNormalizado));

      if (esComandoReservado) {
        return res.json({
          debe_responder: false,
          razon: 'Comando reservado para lógica de N8N',
          tipo_comando: 'reservado_n8n',
          mensaje_analizado: true
        });
      }

      // 🔍 PASO 1: Buscar respuestas automáticas programadas
      const respuestas = await RespuestaAutomatica.findAll({
        where: {
          empresa_id: empresaId
        },
        order: [['fecha_creacion', 'DESC']]
      });

      let respuestaEncontrada = null;
      let disparadorEncontrado = null;

      for (const respuesta of respuestas) {
        const disparador = respuesta.texto_disparador
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

        // ⚠️ VALIDACIÓN: No usar respuestas automáticas que coincidan con comandos reservados
        const esDisparadorReservado = comandosReservados.some(patron => patron.test(disparador));
        if (esDisparadorReservado) {
          continue; // Saltar esta respuesta automática
        }

        if (mensajeNormalizado.includes(disparador)) {
          respuestaEncontrada = respuesta;
          disparadorEncontrado = disparador;
          break;
        }
      }

      if (respuestaEncontrada) {
        return res.json({
          debe_responder: true,
          tipo_respuesta: 'automatica',
          respuesta: {
            id: respuestaEncontrada.id,
            texto: respuestaEncontrada.respuesta,
            tipo: respuestaEncontrada.tipo_respuesta,
            disparador: respuestaEncontrada.texto_disparador
          },
          disparador_detectado: disparadorEncontrado,
          mensaje_analizado: true
        });
      }

      // 🛍️ PASO 2: Detectar si pregunta por PRODUCTOS
      const palabrasProducto = ['producto', 'productos', 'catalogo', 'catálogo', 'precio', 'precios', 'cuanto cuesta', 'disponible', 'venden', 'comprar'];
      const preguntaProductos = palabrasProducto.some(p => mensajeNormalizado.includes(p));

      if (preguntaProductos) {
        const productos = await CatalogoItem.findAll({
          where: {
            empresa_id: empresaId,
            tipo_item: 'producto'
          },
          limit: 10,
          order: [['nombre_item', 'ASC']]
        });

        if (productos.length > 0) {
          return res.json({
            debe_responder: true,
            tipo_respuesta: 'productos',
            items: productos.map(p => ({
              id: p.id,
              nombre: p.nombre_item,
              descripcion: p.descripcion,
              precio: p.precio,
              imagen: p.imagen_url,
              tipo: p.tipo_item
            })),
            total: productos.length,
            mensaje: `📦 Tenemos ${productos.length} productos disponibles. ¿Te interesa alguno en particular?`,
            mensaje_analizado: true
          });
        } else {
          return res.json({
            debe_responder: true,
            tipo_respuesta: 'texto',
            respuesta: {
              texto: 'Por el momento no tenemos productos disponibles en nuestro catálogo. ¿Te puedo ayudar con algo más?'
            },
            mensaje_analizado: true
          });
        }
      }

      // 🛠️ PASO 3: Detectar si pregunta por SERVICIOS
      const palabrasServicio = ['servicio', 'servicios', 'ofrecen', 'hacen', 'trabajo', 'cotizacion', 'cotización', 'contratar'];
      const preguntaServicios = palabrasServicio.some(p => mensajeNormalizado.includes(p));

      if (preguntaServicios) {
        const servicios = await CatalogoItem.findAll({
          where: {
            empresa_id: empresaId,
            tipo_item: 'servicio'
          },
          limit: 10,
          order: [['nombre_item', 'ASC']]
        });

        if (servicios.length > 0) {
          return res.json({
            debe_responder: true,
            tipo_respuesta: 'servicios',
            items: servicios.map(s => ({
              id: s.id,
              nombre: s.nombre_item,
              descripcion: s.descripcion,
              precio: s.precio,
              imagen: s.imagen_url,
              tipo: s.tipo_item
            })),
            total: servicios.length,
            mensaje: `🛠️ Ofrecemos ${servicios.length} servicios. ¿Cuál te interesa conocer?`,
            mensaje_analizado: true
          });
        } else {
          return res.json({
            debe_responder: true,
            tipo_respuesta: 'texto',
            respuesta: {
              texto: 'Por el momento no tenemos servicios publicados. ¿Necesitas información sobre algo específico?'
            },
            mensaje_analizado: true
          });
        }
      }

      // 📋 PASO 4: Detectar si pregunta por TODO EL CATÁLOGO
      const palabrasCatalogo = ['catalogo', 'catálogo', 'todo', 'que tienen', 'que ofrecen', 'mostrar todo'];
      const preguntaCatalogo = palabrasCatalogo.some(p => mensajeNormalizado.includes(p));

      if (preguntaCatalogo) {
        const todosCatalogo = await CatalogoItem.findAll({
          where: { empresa_id: empresaId },
          limit: 15,
          order: [['tipo_item', 'ASC'], ['nombre_item', 'ASC']]
        });

        if (todosCatalogo.length > 0) {
          const productos = todosCatalogo.filter(i => i.tipo_item === 'producto');
          const servicios = todosCatalogo.filter(i => i.tipo_item === 'servicio');

          return res.json({
            debe_responder: true,
            tipo_respuesta: 'catalogo_completo',
            productos: productos.map(p => ({
              id: p.id,
              nombre: p.nombre_item,
              descripcion: p.descripcion,
              precio: p.precio,
              imagen: p.imagen_url,
              tipo: p.tipo_item
            })),
            servicios: servicios.map(s => ({
              id: s.id,
              nombre: s.nombre_item,
              descripcion: s.descripcion,
              precio: s.precio,
              imagen: s.imagen_url,
              tipo: s.tipo_item
            })),
            total_productos: productos.length,
            total_servicios: servicios.length,
            mensaje: `📦 Productos: ${productos.length} | 🛠️ Servicios: ${servicios.length}\n¿Qué te gustaría conocer más a detalle?`,
            mensaje_analizado: true
          });
        }
      }

      // 🔍 PASO 5: Buscar item específico por nombre
      const palabras = mensajeNormalizado.split(' ').filter(p => p.length > 3);
      
      if (palabras.length > 0) {
        const itemEncontrado = await CatalogoItem.findOne({
          where: {
            empresa_id: empresaId,
            [Op.or]: palabras.map(palabra => ({
              nombre_item: { [Op.like]: `%${palabra}%` }
            }))
          }
        });

        if (itemEncontrado) {
          return res.json({
            debe_responder: true,
            tipo_respuesta: 'item_detalle',
            item: {
              id: itemEncontrado.id,
              nombre: itemEncontrado.nombre_item,
              descripcion: itemEncontrado.descripcion,
              precio: itemEncontrado.precio,
              imagen: itemEncontrado.imagen_url,
              tipo: itemEncontrado.tipo_item
            },
            mensaje: `${itemEncontrado.tipo_item === 'producto' ? '📦' : '🛠️'} *${itemEncontrado.nombre_item}*\n\n${itemEncontrado.descripcion || ''}\n\n💰 Precio: ${itemEncontrado.precio ? `$${itemEncontrado.precio}` : 'Consultar'}`,
            mensaje_analizado: true
          });
        }
      }

      // ❌ No se encontró ninguna coincidencia
      return res.json({
        debe_responder: false,
        razon: 'No se detectó ningún disparador en el mensaje',
        respuesta: null,
        mensaje_analizado: true
      });

    } catch (error) {
      console.error('Error al analizar mensaje:', error);
      return res.status(500).json({
        error: 'Error al analizar mensaje',
        debe_responder: false,
        respuesta: null
      });
    }
  },

  // 🆕 BUSCAR EN CATÁLOGO (sin cambios)
  buscarEnCatalogo: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { busqueda, tipo } = req.query;

      const where = { empresa_id: empresaId };

      if (tipo && ['producto', 'servicio'].includes(tipo)) {
        where.tipo_item = tipo;
      }

      if (busqueda && busqueda.trim() !== '') {
        const busquedaNormalizada = busqueda.trim();
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busquedaNormalizada}%` } },
          { descripcion: { [Op.like]: `%${busquedaNormalizada}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({
        where,
        limit: 20,
        order: [['nombre_item', 'ASC']]
      });

      return res.json({
        success: true,
        total: items.length,
        items: items.map(item => ({
          id: item.id,
          nombre: item.nombre_item,
          descripcion: item.descripcion,
          precio: item.precio,
          imagen: item.imagen_url,
          tipo: item.tipo_item
        }))
      });

    } catch (error) {
      console.error('Error al buscar en catálogo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al buscar en catálogo',
        error: error.message
      });
    }
  },

  obtenerItemCatalogo: async (req, res) => {
    try {
      const { empresaId, itemId } = req.params;

      const item = await CatalogoItem.findOne({
        where: {
          id: itemId,
          empresa_id: empresaId
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item no encontrado'
        });
      }

      return res.json({
        success: true,
        item: {
          id: item.id,
          nombre: item.nombre_item,
          descripcion: item.descripcion,
          precio: item.precio,
          imagen: item.imagen_url,
          tipo: item.tipo_item,
          fecha_creacion: item.fecha_creacion
        }
      });

    } catch (error) {
      console.error('Error al obtener item:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el item',
        error: error.message
      });
    }
  },

  // Métodos de configuración y respuestas (sin cambios)
  obtenerRespuestas: async (req, res) => {
    try {
      const { empresaId } = req.params;

      const respuestas = await RespuestaAutomatica.findAll({
        where: { empresa_id: empresaId },
        order: [['fecha_creacion', 'DESC']]
      });

      return res.json({
        success: true,
        data: respuestas
      });

    } catch (error) {
      console.error('Error al obtener respuestas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener respuestas'
      });
    }
  },

  crearRespuesta: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { texto_disparador, respuesta, tipo_respuesta } = req.body;

      if (!texto_disparador || !respuesta) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere texto_disparador y respuesta'
        });
      }

      // 🔥 VALIDACIÓN: No permitir crear respuestas automáticas con comandos reservados
      const comandosReservados = [
        /^cancelar$/i,
        /^cancelar\s+pedido\s*#?\d+$/i,
        /^\d+,\d+(;\d+,\d+)*$/,
        /^(mis\s+)?pedidos?$/i,
        /^historial$/i,
        /^(si|sí|no)$/i
      ];

      const disparadorNormalizado = texto_disparador.toLowerCase().trim();
      const esReservado = comandosReservados.some(patron => patron.test(disparadorNormalizado));

      if (esReservado) {
        return res.status(400).json({
          success: false,
          message: 'Este disparador está reservado para la lógica del sistema. No se puede crear una respuesta automática para él.'
        });
      }

      const existente = await RespuestaAutomatica.findOne({
        where: {
          empresa_id: empresaId,
          texto_disparador: disparadorNormalizado
        }
      });

      if (existente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una respuesta con ese disparador'
        });
      }

      const nuevaRespuesta = await RespuestaAutomatica.create({
        empresa_id: empresaId,
        texto_disparador: disparadorNormalizado,
        respuesta,
        tipo_respuesta: tipo_respuesta || 'texto'
      });

      return res.status(201).json({
        success: true,
        message: 'Respuesta automática creada exitosamente',
        data: nuevaRespuesta
      });

    } catch (error) {
      console.error('Error al crear respuesta:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear respuesta'
      });
    }
  },

  actualizarRespuesta: async (req, res) => {
    try {
      const { empresaId, respuestaId } = req.params;
      const datos = req.body;

      const respuesta = await RespuestaAutomatica.findOne({
        where: {
          id: respuestaId,
          empresa_id: empresaId
        }
      });

      if (!respuesta) {
        return res.status(404).json({
          success: false,
          message: 'Respuesta no encontrada'
        });
      }

      await respuesta.update(datos);

      return res.json({
        success: true,
        message: 'Respuesta actualizada exitosamente',
        data: respuesta
      });

    } catch (error) {
      console.error('Error al actualizar respuesta:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar respuesta'
      });
    }
  },

  eliminarRespuesta: async (req, res) => {
    try {
      const { empresaId, respuestaId } = req.params;

      const respuesta = await RespuestaAutomatica.findOne({
        where: {
          id: respuestaId,
          empresa_id: empresaId
        }
      });

      if (!respuesta) {
        return res.status(404).json({
          success: false,
          message: 'Respuesta no encontrada'
        });
      }

      await respuesta.destroy();

      return res.json({
        success: true,
        message: 'Respuesta eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar respuesta:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar respuesta'
      });
    }
  },

  obtenerConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;

      const config = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      return res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('Error al obtener configuración:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener configuración'
      });
    }
  },

  crearConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const datos = req.body;

      const configExistente = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId }
      });

      if (configExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una configuración para esta empresa'
        });
      }

      const nuevaConfig = await ConfiguracionChatbot.create({
        empresa_id: empresaId,
        ...datos
      });

      return res.status(201).json({
        success: true,
        message: 'Configuración creada exitosamente',
        data: nuevaConfig
      });

    } catch (error) {
      console.error('Error al crear configuración:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear configuración'
      });
    }
  },

  actualizarConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const datos = req.body;

      const config = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      await config.update(datos);

      return res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: config
      });

    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar configuración'
      });
    }
  },

  eliminarConfiguracion: async (req, res) => {
    try {
      const { empresaId } = req.params;

      const config = await ConfiguracionChatbot.findOne({
        where: { empresa_id: empresaId }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      await config.destroy();

      return res.json({
        success: true,
        message: 'Configuración eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar configuración:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar configuración'
      });
    }
  }
};

module.exports = chatbotController;