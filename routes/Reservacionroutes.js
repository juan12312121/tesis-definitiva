const express = require('express');
const router = express.Router();
const {
  getReservaciones,
  getReservacionesCliente,
  crearReservacion,
  actualizarEstado,
  actualizarReservacion,
  eliminarReservacion
} = require('../controllers/Reservacioncontroller');

// Rutas operacionales sobre reserva de turnos para servicios

// Solicitar todo el listado de citas programadas en la empresa
router.get('/:empresaId', getReservaciones);

// Filtrar el historial de citas correspondientes a un unico usuario numerico
router.get('/cliente/:telefono/:empresaId', getReservacionesCliente);

// Agendar oficialmente una nueva cita
router.post('/', crearReservacion);

// Modificar de manera controlada el estatus (ej. pendiente, confirmada, cancelada)
router.put('/:id/estado', actualizarEstado);

// Reasignar detalles especificos pre-acordados de la reservacion
router.put('/:id', actualizarReservacion);

// Remover la cita de la base de datos definitivamente
router.delete('/:id', eliminarReservacion);

module.exports = router;