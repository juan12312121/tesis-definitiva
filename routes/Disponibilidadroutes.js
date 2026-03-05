const express = require('express');
const router = express.Router();
const {
  getDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
  reemplazarDisponibilidad
} = require('../controllers/Disponibilidadserviciocontroller');

// Rutas orientadas a los dias y horarios de atencion de servicios

// Requerir el calendario de horarios disponibles de un servicio puntual
router.get('/:servicioId', getDisponibilidad);

// Instanciar un nuevo bloque de horario para un servicio
router.post('/', crearDisponibilidad);

// Limpiar y cargar desde cero multiples horarios a la vez
router.post('/bulk/:servicioId', reemplazarDisponibilidad);

// Ajustar parametros de tiempo de un bloque especifico
router.put('/:id', actualizarDisponibilidad);

// Eliminar un espacio de horario asignado
router.delete('/:id', eliminarDisponibilidad);

module.exports = router;