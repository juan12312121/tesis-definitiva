const { CategoriaServicio } = require('../models');

// Obtener todas las categorias de servicio pertenecientes a una empresa
// GET /api/categorias-servicios/:empresaId
const getCategorias = async (req, res) => {
  try {
    const { empresaId } = req.params;
    // Realizar busqueda filtrada por empresa y en orden alfabetico
    const categorias = await CategoriaServicio.findAll({
      where: { empresa_id: empresaId },
      order: [['nombre', 'ASC']]
    });
    // Entregar los datos estructurados al frontend
    res.json({ success: true, data: categorias });
  } catch (error) {
    // Si hay falla emitir error interno
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Registrar una categoria de servicio nueva
// POST /api/categorias-servicios
const crearCategoria = async (req, res) => {
  try {
    const { empresa_id, nombre, descripcion } = req.body;
    // Validar que no falten atributos obligatorios
    if (!empresa_id || !nombre) {
      return res.status(400).json({ success: false, mensaje: 'empresa_id y nombre son requeridos' });
    }
    // Escribir en la base de datos la formacion requerida
    const categoria = await CategoriaServicio.create({ empresa_id, nombre, descripcion });
    res.status(201).json({ success: true, data: categoria });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Cambiar nombre u otras propiedades de categoria
// PUT /api/categorias-servicios/:id
const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activa } = req.body;

    // Intentar buscar la categoria para sobreescribir
    const categoria = await CategoriaServicio.findByPk(id);
    if (!categoria) return res.status(404).json({ success: false, mensaje: 'Categoría no encontrada' });

    // Ejecutar sobreescritura con el modelo
    await categoria.update({ nombre, descripcion, activa });
    res.json({ success: true, data: categoria });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Borrado de una categoria particular
// DELETE /api/categorias-servicios/:id
const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    // Asegurar que exista previamente el documento o id listado
    const categoria = await CategoriaServicio.findByPk(id);
    if (!categoria) return res.status(404).json({ success: false, mensaje: 'Categoría no encontrada' });

    // Ejecutar el comando para remover de la tabla
    await categoria.destroy();
    res.json({ success: true, mensaje: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

module.exports = { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria };