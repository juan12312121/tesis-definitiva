const { HistorialMensajes, Empresa } = require('../models');
const { Op } = require('sequelize');

// Guardar mensaje en historial
const guardarMensaje = async (req, res) => {
  try {
    const {
      empresa_id,
      numero_cliente,
      mensaje_enviado,
      mensaje_recibido,
      tipo_mensaje
    } = req.body;

    // Validar que al menos uno de los mensajes esté presente
    if (!mensaje_enviado && !mensaje_recibido) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar mensaje_enviado o mensaje_recibido'
      });
    }

    const historial = await HistorialMensajes.create({
      empresa_id,
      numero_cliente,
      mensaje_enviado: mensaje_enviado || null,
      mensaje_recibido: mensaje_recibido || null,
      tipo_mensaje: tipo_mensaje || 'texto'
    });

    console.log(`💾 Mensaje guardado en historial: Empresa ${empresa_id} - Cliente ${numero_cliente}`);

    res.status(201).json({
      success: true,
      message: 'Mensaje guardado en historial',
      data: historial
    });
  } catch (error) {
    console.error('Error guardando mensaje:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener historial de conversación con un cliente específico
const obtenerHistorialCliente = async (req, res) => {
  try {
    const { empresaId, numeroCliente } = req.params;
    const { limite = 50, offset = 0 } = req.query;

    const historial = await HistorialMensajes.findAll({
      where: {
        empresa_id: empresaId,
        numero_cliente: numeroCliente
      },
      order: [['fecha_envio', 'DESC']],
      limit: parseInt(limite),
      offset: parseInt(offset)
    });

    // Contar total de mensajes
    const total = await HistorialMensajes.count({
      where: {
        empresa_id: empresaId,
        numero_cliente: numeroCliente
      }
    });

    res.json({
      success: true,
      total,
      limite: parseInt(limite),
      offset: parseInt(offset),
      data: historial
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener todos los clientes que han conversado con una empresa
const obtenerClientesConversaciones = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const clientes = await HistorialMensajes.findAll({
      attributes: [
        'numero_cliente',
        [sequelize.fn('MAX', sequelize.col('fecha_envio')), 'ultima_conversacion'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_mensajes']
      ],
      where: {
        empresa_id: empresaId
      },
      group: ['numero_cliente'],
      order: [[sequelize.fn('MAX', sequelize.col('fecha_envio')), 'DESC']]
    });

    res.json({
      success: true,
      total: clientes.length,
      data: clientes
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener últimos mensajes recibidos (inbox)
const obtenerMensajesRecibidos = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { limite = 20 } = req.query;

    const mensajes = await HistorialMensajes.findAll({
      where: {
        empresa_id: empresaId,
        mensaje_recibido: {
          [Op.ne]: null
        }
      },
      order: [['fecha_envio', 'DESC']],
      limit: parseInt(limite)
    });

    res.json({
      success: true,
      total: mensajes.length,
      data: mensajes
    });
  } catch (error) {
    console.error('Error obteniendo mensajes recibidos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Buscar en historial de mensajes
const buscarEnHistorial = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { busqueda, fechaInicio, fechaFin, numeroCliente } = req.query;

    let whereCondition = {
      empresa_id: empresaId
    };

    // Filtro por búsqueda de texto
    if (busqueda) {
      whereCondition[Op.or] = [
        {
          mensaje_enviado: {
            [Op.like]: `%${busqueda}%`
          }
        },
        {
          mensaje_recibido: {
            [Op.like]: `%${busqueda}%`
          }
        }
      ];
    }

    // Filtro por rango de fechas
    if (fechaInicio && fechaFin) {
      whereCondition.fecha_envio = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    }

    // Filtro por número de cliente
    if (numeroCliente) {
      whereCondition.numero_cliente = numeroCliente;
    }

    const resultados = await HistorialMensajes.findAll({
      where: whereCondition,
      order: [['fecha_envio', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      total: resultados.length,
      data: resultados
    });
  } catch (error) {
    console.error('Error buscando en historial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Estadísticas de mensajes
const obtenerEstadisticas = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    let whereCondition = {
      empresa_id: empresaId
    };

    if (fechaInicio && fechaFin) {
      whereCondition.fecha_envio = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    }

    // Total de mensajes
    const totalMensajes = await HistorialMensajes.count({
      where: whereCondition
    });

    // Mensajes recibidos
    const mensajesRecibidos = await HistorialMensajes.count({
      where: {
        ...whereCondition,
        mensaje_recibido: {
          [Op.ne]: null
        }
      }
    });

    // Mensajes enviados
    const mensajesEnviados = await HistorialMensajes.count({
      where: {
        ...whereCondition,
        mensaje_enviado: {
          [Op.ne]: null
        }
      }
    });

    // Clientes únicos
    const clientesUnicos = await HistorialMensajes.count({
      where: whereCondition,
      distinct: true,
      col: 'numero_cliente'
    });

    // Mensajes por tipo
    const mensajesPorTipo = await HistorialMensajes.findAll({
      attributes: [
        'tipo_mensaje',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      where: whereCondition,
      group: ['tipo_mensaje']
    });

    res.json({
      success: true,
      data: {
        total_mensajes: totalMensajes,
        mensajes_recibidos: mensajesRecibidos,
        mensajes_enviados: mensajesEnviados,
        clientes_unicos: clientesUnicos,
        mensajes_por_tipo: mensajesPorTipo
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  guardarMensaje,
  obtenerHistorialCliente,
  obtenerClientesConversaciones,
  obtenerMensajesRecibidos,
  buscarEnHistorial,
  obtenerEstadisticas
};