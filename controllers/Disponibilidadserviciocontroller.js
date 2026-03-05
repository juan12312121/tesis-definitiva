const { DisponibilidadServicio } = require('../models');

// Consultar los periodos habilitados de un tipo de servicio
// GET /api/disponibilidad/:servicioId
const getDisponibilidad = async (req, res) => {
  try {
    const { servicioId } = req.params;
    // Consultar horarios de este servicio que esten encendidos o activos
    const disponibilidad = await DisponibilidadServicio.findAll({
      where: { servicio_id: servicioId, activo: 1 },
      // Estructurar primero por dias de la semana para orden natural
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']]
    });
    res.json({ success: true, data: disponibilidad });
  } catch (error) {
    // Manejo clasico de fallos
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Generar un evento de disponibilidad adicional
// POST /api/disponibilidad
const crearDisponibilidad = async (req, res) => {
  try {
    const { servicio_id, empresa_id, dia_semana, hora_inicio, hora_fin } = req.body;

    // Validación restrictiva impidiendo bloques invalidos
    if (!servicio_id || !empresa_id || dia_semana === undefined || !hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, mensaje: 'Todos los campos son requeridos' });
    }

    // Creación a traves de ORM
    const disp = await DisponibilidadServicio.create({
      servicio_id, empresa_id, dia_semana, hora_inicio, hora_fin
    });
    res.status(201).json({ success: true, data: disp });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Editar un horario especifico
// PUT /api/disponibilidad/:id
const actualizarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    // Verificar que esta disponibilidad corresponde a un dato legitimo
    const disp = await DisponibilidadServicio.findByPk(id);
    if (!disp) return res.status(404).json({ success: false, mensaje: 'Disponibilidad no encontrada' });

    // Actualizar unicamente lo que se mande en la peticion
    await disp.update(req.body);
    res.json({ success: true, data: disp });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Quitar un periodo de agenda de la disponibilidad del servicio
// DELETE /api/disponibilidad/:id
const eliminarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;

    // Busqueda del horario apuntado
    const disp = await DisponibilidadServicio.findByPk(id);
    if (!disp) return res.status(404).json({ success: false, mensaje: 'Disponibilidad no encontrada' });

    // Remocion del horario 
    await disp.destroy();
    res.json({ success: true, mensaje: 'Disponibilidad eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

// Sobreescribir todo el vector de disponibilidades de acuerdo a los ultimos cambios 
// POST /api/disponibilidad/bulk/:servicioId  (reemplazar toda la disponibilidad)
const reemplazarDisponibilidad = async (req, res) => {
  try {
    const { servicioId } = req.params;
    // Entrada masiva de horarios como matriz de objetos
    const { empresa_id, horarios } = req.body; // horarios: [{dia_semana, hora_inicio, hora_fin}]

    // Analisis logico para no realizar inserciones corruptas
    if (!empresa_id || !Array.isArray(horarios)) {
      return res.status(400).json({ success: false, mensaje: 'empresa_id y horarios[] son requeridos' });
    }

    // Se elimina el registro existente para este servicio 
    await DisponibilidadServicio.destroy({ where: { servicio_id: servicioId } });

    // Mapeo transformando el arreglo a parametros admitidos sin fallos de conversion
    const nuevos = horarios.map(h => ({ ...h, servicio_id: parseInt(servicioId), empresa_id }));
    const creados = await DisponibilidadServicio.bulkCreate(nuevos);

    // Retornamos el conjunto regenerado
    res.json({ success: true, data: creados });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
  reemplazarDisponibilidad
};