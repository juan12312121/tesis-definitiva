const express = require('express');
const router = express.Router();
const {
  getCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
} = require('../controllers/Categoriaserviciocontroller');

// Rutas para la operacion basica sobre categorias de servicios

// Listado de todas las categorias que pertenecen a la empresa
router.get('/:empresaId', getCategorias);

// Crear una nueva categoria de agrupacion
router.post('/', crearCategoria);

// Aplicar cambios en informacion de una categoria ya existente
router.put('/:id', actualizarCategoria);

// Quitar una categoria de la lista activa
router.delete('/:id', eliminarCategoria);

module.exports = router;