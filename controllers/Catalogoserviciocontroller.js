const { CatalogoServicio, CategoriaServicio, DisponibilidadServicio } = require('../models');

// Obtener todos los servicios asociados a una empresa
// GET /api/catalogo-servicios/:empresaId
const getServicios = async (req, res) => {
  try {
    const { empresaId } = req.params;
    // Buscar todos los servicios de la empresa con sus categorias y disponibilidades
    const servicios = await CatalogoServicio.findAll({
      where: { empresa_id: empresaId },
      include: [
        { model: CategoriaServicio, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: DisponibilidadServicio, as: 'disponibilidad' }
      ],
      order: [['nombre', 'ASC']]
    });
    // Responder con los datos encontrados
    res.json({ success: true, data: servicios });
  } catch (error) {
    // Manejo de errores en caso de falla en la base de datos
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Obtener unicamente los servicios que esten publicamente disponibles
// GET /api/catalogo-servicios/publico/:empresaId
const getServiciosPublico = async (req, res) => {
  try {
    const { empresaId } = req.params;
    // Filtrar servicios con disponibilidad igual a 1
    const servicios = await CatalogoServicio.findAll({
      where: { empresa_id: empresaId, disponible: 1 },
      include: [
        { model: CategoriaServicio, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: DisponibilidadServicio, as: 'disponibilidad', where: { activo: 1 }, required: false }
      ],
      order: [['nombre', 'ASC']]
    });
    // Enviar listado publico
    res.json({ success: true, data: servicios });
  } catch (error) {
    // Retornar error generico si la busqueda falla
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Obtener los detalles de un solo servicio en base a su id
// GET /api/catalogo-servicios/detalle/:id
const getServicioDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    // Buscar la llave primaria y extender informacion de categoria y disponibilidad
    const servicio = await CatalogoServicio.findByPk(id, {
      include: [
        { model: CategoriaServicio, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: DisponibilidadServicio, as: 'disponibilidad' }
      ]
    });
    // Si no existe, devolver estatus de no encontrado
    if (!servicio) return res.status(404).json({ success: false, mensaje: 'Servicio no encontrado' });
    res.json({ success: true, data: servicio });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Crear un nuevo registro dentro del catalogo de servicios
// POST /api/catalogo-servicios
const crearServicio = async (req, res) => {
  try {
    // Extraer los datos provenientes de la peticion
    const {
      empresa_id, categoria_id, nombre, descripcion,
      precio, duracion_minutos, requiere_agendamiento,
      disponible, imagen_url, tags
    } = req.body;

    // Validar informacion fundamental obligatoria
    if (!empresa_id || !nombre) {
      return res.status(400).json({ success: false, mensaje: 'empresa_id y nombre son requeridos' });
    }

    // Generar el registro con el modelo
    const servicio = await CatalogoServicio.create({
      empresa_id, categoria_id, nombre, descripcion,
      precio, duracion_minutos, requiere_agendamiento,
      disponible, imagen_url, tags
    });
    // Retornar el servicio recien creado con estatus 201
    res.status(201).json({ success: true, data: servicio });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Modificar los detalles de un servicio existente
// PUT /api/catalogo-servicios/:id
const actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    // Localizar el servicio para asegurar que existe
    const servicio = await CatalogoServicio.findByPk(id);
    if (!servicio) return res.status(404).json({ success: false, mensaje: 'Servicio no encontrado' });

    // Aplicar los cambios sobre el mismo objeto
    await servicio.update(req.body);
    res.json({ success: true, data: servicio });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Eliminar un servicio de la base de datos
// DELETE /api/catalogo-servicios/:id
const eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    // Búsqueda preliminar
    const servicio = await CatalogoServicio.findByPk(id);
    if (!servicio) return res.status(404).json({ success: false, mensaje: 'Servicio no encontrado' });

    // Destruir registro original
    await servicio.destroy();
    res.json({ success: true, mensaje: 'Servicio eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getServicios,
  getServiciosPublico,
  getServicioDetalle,
  crearServicio,
  actualizarServicio,
  eliminarServicio
};