const { Reservacion, CatalogoServicio } = require('../models');
const { Op } = require('sequelize');

// Listar todas las citas acordadas en el negocio
// GET /api/reservaciones/:empresaId
const getReservaciones = async (req, res) => {
  try {
    const { empresaId } = req.params;
    // Se extrae la condicion deseada
    const { estado, fecha } = req.query;

    // Se prepara el objetivo base de la consulta
    const where = { empresa_id: empresaId };
    if (estado) where.estado = estado;

    // De haber filtrado con fecha, se ajusta el margen y rango para un dia completo
    if (fecha) {
      where.fecha_reservacion = {
        [Op.between]: [`${fecha} 00:00:00`, `${fecha} 23:59:59`]
      };
    }

    // Realizamos la peticion final agregando nombres de los servicios acoplados
    const reservaciones = await Reservacion.findAll({
      where,
      include: [{ model: CatalogoServicio, as: 'servicio', attributes: ['id', 'nombre', 'duracion_minutos'] }],
      order: [['fecha_reservacion', 'ASC']]
    });

    res.json({ success: true, data: reservaciones });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Ubicar las reservas segun el telefono del cliente solicitante
// GET /api/reservaciones/cliente/:telefono/:empresaId
const getReservacionesCliente = async (req, res) => {
  try {
    const { telefono, empresaId } = req.params;
    // Peticion estricta del telefono relacionado a esta empresa
    const reservaciones = await Reservacion.findAll({
      where: { telefono_cliente: telefono, empresa_id: empresaId },
      include: [{ model: CatalogoServicio, as: 'servicio', attributes: ['id', 'nombre'] }],
      order: [['fecha_reservacion', 'DESC']]
    });
    res.json({ success: true, data: reservaciones });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Consolidar proceso de agendamiento
// POST /api/reservaciones
const crearReservacion = async (req, res) => {
  try {
    const {
      empresa_id, servicio_id, nombre_cliente,
      telefono_cliente, fecha_reservacion,
      numero_personas, notas
    } = req.body;

    // Barrera de obligatoriedad en llaves maestras 
    if (!empresa_id || !nombre_cliente || !telefono_cliente || !fecha_reservacion) {
      return res.status(400).json({ success: false, mensaje: 'empresa_id, nombre_cliente, telefono_cliente y fecha_reservacion son requeridos' });
    }

    // Enviar instrucción al modelo de escritura
    const reservacion = await Reservacion.create({
      empresa_id, servicio_id, nombre_cliente,
      telefono_cliente, fecha_reservacion,
      numero_personas, notas
    });

    // Reportar respuesta conteniendo identificador a quien corresponda
    res.status(201).json({ success: true, data: reservacion });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Manejo de fase en la que se halla la cita (Aceptar/declinar)
// PUT /api/reservaciones/:id/estado
const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Asegurar compatibilidad estricta con enumeradores aceptados en dialecto sql
    if (!['pendiente', 'confirmada', 'cancelada'].includes(estado)) {
      return res.status(400).json({ success: false, mensaje: 'Estado inválido' });
    }

    const reservacion = await Reservacion.findByPk(id);
    if (!reservacion) return res.status(404).json({ success: false, mensaje: 'Reservación no encontrada' });

    // Solo modificar esta fase de ser correcto
    await reservacion.update({ estado });
    res.json({ success: true, data: reservacion });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Realizar ajustes menores en algun registro por equivocación
// PUT /api/reservaciones/:id
const actualizarReservacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Preevaluar si está registrado
    const reservacion = await Reservacion.findByPk(id);
    if (!reservacion) return res.status(404).json({ success: false, mensaje: 'Reservación no encontrada' });

    // Reestructurar campos y guardar cambios
    await reservacion.update(req.body);
    res.json({ success: true, data: reservacion });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Inhabilitar por completo un registro o descartar como falso
// DELETE /api/reservaciones/:id
const eliminarReservacion = async (req, res) => {
  try {
    const { id } = req.params;

    const reservacion = await Reservacion.findByPk(id);
    if (!reservacion) return res.status(404).json({ success: false, mensaje: 'Reservación no encontrada' });

    // Supresión fisica y no dinamica
    await reservacion.destroy();
    res.json({ success: true, mensaje: 'Reservación eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getReservaciones,
  getReservacionesCliente,
  crearReservacion,
  actualizarEstado,
  actualizarReservacion,
  eliminarReservacion
};