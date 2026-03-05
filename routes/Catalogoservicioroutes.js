const express = require('express');
const router = express.Router();
const {
  getServicios,
  getServiciosPublico,
  getServicioDetalle,
  crearServicio,
  actualizarServicio,
  eliminarServicio
} = require('../controllers/Catalogoserviciocontroller');

// Rutas para la gestion del catalogo de servicios

// Obtener los servicios habilitados publicamente para una empresa especifica
router.get('/publico/:empresaId', getServiciosPublico);

// Obtener detalles extendidos de un servicio particular
router.get('/detalle/:id', getServicioDetalle);

// Obtener todos los servicios registrados bajo una misma empresa (requiere autenticacion)
router.get('/:empresaId', getServicios);

// Registrar un nuevo servicio en el catalogo
router.post('/', crearServicio);

// Modificar los detalles de un servicio existente
router.put('/:id', actualizarServicio);

// Eliminar un servicio definitivamente del catalogo
router.delete('/:id', eliminarServicio);

module.exports = router;